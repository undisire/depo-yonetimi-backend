const express = require("express");
const router = express.Router();
const File = require("../models/File");
const fileService = require("../services/fileService");
const { auth } = require("../middleware/auth");
const { cache } = require("../middleware/cache");
const {
  activityLogger,
  ActivityTypes,
} = require("../middleware/activityLogger");
const {
  performanceMonitor,
  OperationTypes,
} = require("../middleware/performanceMonitor");
const { validate } = require("../middleware/validators");
const debug = require("debug")("app:files");

// Dosya yükleme middleware'i
const upload = fileService.getMulterConfig();

// Dosya listesi
router.get(
  "/",
  auth(["admin", "muhendis"]),
  cache("files:list"),
  performanceMonitor(OperationTypes.LIST_FILES),
  async (req, res, next) => {
    try {
      const { category } = req.query;
      const files = await File.findAll({
        where: category ? { category } : undefined,
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Dosya detayı
router.get("/:id", auth(["admin", "muhendis"]), async (req, res, next) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: "Dosya bulunamadı",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
});

// Dosya yükleme
router.post(
  "/upload",
  auth(["admin", "muhendis"]),
  upload.single("file"),
  activityLogger(ActivityTypes.UPLOAD_FILE),
  performanceMonitor(OperationTypes.UPLOAD_FILE),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Dosya yüklenemedi",
        });
      }

      const { category, description, tags } = req.body;
      const processedFile = await fileService.processFile(req.file, category);

      const file = await File.create({
        ...processedFile,
        description,
        tags: tags ? JSON.parse(tags) : [],
        uploadedBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Çoklu dosya yükleme
router.post(
  "/upload/multiple",
  auth(["admin", "muhendis"]),
  upload.array("files", 10),
  activityLogger(ActivityTypes.UPLOAD_MULTIPLE_FILES),
  performanceMonitor(OperationTypes.UPLOAD_FILE),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Dosyalar yüklenemedi",
        });
      }

      const { category, description } = req.body;
      const files = await Promise.all(
        req.files.map(async (file) => {
          const processedFile = await fileService.processFile(file, category);
          return File.create({
            ...processedFile,
            description,
            uploadedBy: req.user.id,
          });
        })
      );

      res.status(201).json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Dosya güncelleme
router.put(
  "/:id",
  auth(["admin"]),
  validate,
  activityLogger(ActivityTypes.UPDATE_FILE),
  performanceMonitor(OperationTypes.UPDATE_FILE),
  async (req, res, next) => {
    try {
      const file = await File.findByPk(req.params.id);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: "Dosya bulunamadı",
        });
      }

      const { description, tags, isActive } = req.body;
      await file.update({
        description,
        tags: tags ? JSON.parse(tags) : file.tags,
        isActive,
      });

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Dosya silme
router.delete(
  "/:id",
  auth(["admin"]),
  activityLogger(ActivityTypes.DELETE_FILE),
  performanceMonitor(OperationTypes.DELETE_FILE),
  async (req, res, next) => {
    try {
      const file = await File.findByPk(req.params.id);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: "Dosya bulunamadı",
        });
      }

      await fileService.deleteFile(file.path);
      await file.destroy();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Dosya indirme
router.get(
  "/:id/download",
  auth(["admin", "muhendis"]),
  activityLogger(ActivityTypes.DOWNLOAD_FILE),
  performanceMonitor(OperationTypes.DOWNLOAD_FILE),
  async (req, res, next) => {
    try {
      const file = await File.findByPk(req.params.id);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: "Dosya bulunamadı",
        });
      }

      const fileContent = await fileService.readFile(file.path);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.originalName}"`
      );
      res.send(fileContent);
    } catch (error) {
      next(error);
    }
  }
);

// Dosya önizleme
router.get(
  "/:id/preview",
  auth(["admin", "muhendis"]),
  activityLogger(ActivityTypes.PREVIEW_FILE),
  performanceMonitor(OperationTypes.PREVIEW_FILE),
  async (req, res, next) => {
    try {
      const file = await File.findByPk(req.params.id);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: "Dosya bulunamadı",
        });
      }

      const fileContent = await fileService.readFile(file.path);
      res.setHeader("Content-Type", file.mimeType);
      res.send(fileContent);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
