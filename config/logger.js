const winston = require('winston');
const path = require('path');

// Log dosyaları için klasör yolu
const logDir = path.join(__dirname, '../logs');

// Log formatı
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Winston logger yapılandırması
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Hata logları için
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tüm loglar için
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Aktivite logları için
    new winston.transports.File({
      filename: path.join(logDir, 'activity.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Geliştirme ortamında konsol çıktısı
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Log fonksiyonları
const logActivity = (userId, action, details) => {
  logger.info('User Activity', {
    userId,
    action,
    details,
    timestamp: new Date()
  });
};

const logError = (error, userId = null, additionalInfo = {}) => {
  logger.error('Error', {
    userId,
    error: {
      message: error.message,
      stack: error.stack,
      ...additionalInfo
    },
    timestamp: new Date()
  });
};

const logStockMovement = (materialId, type, quantity, userId, details) => {
  logger.info('Stock Movement', {
    materialId,
    type, // 'in' veya 'out'
    quantity,
    userId,
    details,
    timestamp: new Date()
  });
};

const logSystemEvent = (event, details) => {
  logger.info('System Event', {
    event,
    details,
    timestamp: new Date()
  });
};

module.exports = {
  logger,
  logActivity,
  logError,
  logStockMovement,
  logSystemEvent
};
