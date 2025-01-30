const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const debug = require('debug')('app:file');
const { logger } = require('./loggerService');

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.allowedTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.initializeDirectories();
  }

  // Dizinleri oluştur
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      debug('Upload directories initialized');
    } catch (error) {
      logger.error('Error initializing upload directories:', error);
      throw error;
    }
  }

  // Multer yapılandırması
  getMulterConfig() {
    return multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, this.tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      }),
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedTypes[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new Error('Desteklenmeyen dosya türü'));
        }
      }
    });
  }

  // Dosya türüne göre işleme
  async processFile(file, category) {
    try {
      const ext = this.allowedTypes[file.mimetype];
      const fileName = `${uuidv4()}.${ext}`;
      const targetDir = path.join(this.uploadDir, category);
      const targetPath = path.join(targetDir, fileName);

      await fs.mkdir(targetDir, { recursive: true });

      if (file.mimetype.startsWith('image/')) {
        await this.processImage(file.path, targetPath);
      } else {
        await fs.copyFile(file.path, targetPath);
      }

      await fs.unlink(file.path);

      return {
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: path.relative(this.uploadDir, targetPath),
        category
      };
    } catch (error) {
      logger.error('Error processing file:', error);
      throw error;
    }
  }

  // Resim işleme
  async processImage(sourcePath, targetPath) {
    try {
      await sharp(sourcePath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(targetPath);

      debug('Image processed successfully');
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  // Dosya silme
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
      debug(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  // Dosya okuma
  async readFile(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      logger.error('Error reading file:', error);
      throw error;
    }
  }

  // Dosya bilgisi alma
  async getFileInfo(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw error;
    }
  }

  // Dosya listesi alma
  async listFiles(category) {
    try {
      const targetDir = path.join(this.uploadDir, category);
      const files = await fs.readdir(targetDir);
      return Promise.all(
        files.map(async (file) => {
          const filePath = path.join(category, file);
          const info = await this.getFileInfo(filePath);
          return {
            name: file,
            path: filePath,
            ...info
          };
        })
      );
    } catch (error) {
      logger.error('Error listing files:', error);
      throw error;
    }
  }

  // Dosya taşıma
  async moveFile(sourcePath, targetPath) {
    try {
      const sourceFullPath = path.join(this.uploadDir, sourcePath);
      const targetFullPath = path.join(this.uploadDir, targetPath);
      await fs.mkdir(path.dirname(targetFullPath), { recursive: true });
      await fs.rename(sourceFullPath, targetFullPath);
      debug(`File moved from ${sourcePath} to ${targetPath}`);
    } catch (error) {
      logger.error('Error moving file:', error);
      throw error;
    }
  }

  // Dosya kopyalama
  async copyFile(sourcePath, targetPath) {
    try {
      const sourceFullPath = path.join(this.uploadDir, sourcePath);
      const targetFullPath = path.join(this.uploadDir, targetPath);
      await fs.mkdir(path.dirname(targetFullPath), { recursive: true });
      await fs.copyFile(sourceFullPath, targetFullPath);
      debug(`File copied from ${sourcePath} to ${targetPath}`);
    } catch (error) {
      logger.error('Error copying file:', error);
      throw error;
    }
  }

  // Dosya var mı kontrolü
  async exists(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // Geçici dosyaları temizle
  async cleanupTemp() {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map((file) =>
          fs.unlink(path.join(this.tempDir, file))
        )
      );
      debug('Temporary files cleaned up');
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
      throw error;
    }
  }
}

// Singleton instance
const fileService = new FileService();

module.exports = fileService;
