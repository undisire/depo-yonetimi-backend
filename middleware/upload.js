const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Dosya yükleme dizinleri
const uploadDirs = {
  delivery_document: 'uploads/deliveries',
  material_document: 'uploads/materials',
  request_document: 'uploads/requests'
};

// Dosya yükleme limitleri
const fileSizeLimits = {
  delivery_document: 10 * 1024 * 1024, // 10MB
  material_document: 5 * 1024 * 1024,  // 5MB
  request_document: 5 * 1024 * 1024    // 5MB
};

// İzin verilen dosya tipleri
const allowedMimeTypes = {
  delivery_document: ['application/pdf', 'image/jpeg', 'image/png'],
  material_document: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  request_document: ['application/pdf', 'image/jpeg', 'image/png']
};

// Multer storage yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'delivery_document';
    const uploadDir = path.join(__dirname, '..', uploadDirs[category]);
    
    // Dizin yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Benzersiz dosya adı oluştur
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Dosya filtresi
const fileFilter = (req, file, cb) => {
  const category = req.body.category || 'delivery_document';
  
  // MIME type kontrolü
  if (!allowedMimeTypes[category].includes(file.mimetype)) {
    cb(new Error('Geçersiz dosya tipi'), false);
    return;
  }
  
  cb(null, true);
};

// Multer middleware'i
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (req, file) => {
      const category = req.body.category || 'delivery_document';
      return fileSizeLimits[category];
    }
  }
});

module.exports = upload;
