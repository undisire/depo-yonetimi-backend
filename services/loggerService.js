const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const debug = require('debug')('app:logger');

// Log seviyeleri
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log renkleri
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Winston'a renkleri ekle
winston.addColors(colors);

// Log formatı
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.meta ? ' ' + JSON.stringify(info.meta) : ''}`
  )
);

// Konsol transport'u
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    format
  )
});

// Dosya transport'ları
const fileTransports = {
  error: new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error'
  }),
  combined: new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  http: new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'http'
  }),
  activity: new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'activity-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info'
  })
};

// Logger oluştur
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports: [
    consoleTransport,
    fileTransports.error,
    fileTransports.combined,
    fileTransports.http,
    fileTransports.activity
  ]
});

// Debug modunda ekstra bilgi
if (process.env.NODE_ENV !== 'production') {
  debug('Debug modu aktif');
  logger.debug('Debug loglama başlatıldı');
}

// Özel log metodları
const logError = (error, userId = null, meta = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    userId,
    ...meta
  };

  logger.error('Hata oluştu', { meta: errorInfo });
  debug('Hata detayı:', errorInfo);
};

const logActivity = (action, userId, meta = {}) => {
  const activityInfo = {
    action,
    userId,
    timestamp: new Date(),
    ...meta
  };

  logger.info('Kullanıcı aktivitesi', { meta: activityInfo });
  debug('Aktivite detayı:', activityInfo);
};

const logHttp = (req, res, responseTime) => {
  const httpInfo = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('user-agent')
  };

  logger.http('HTTP İsteği', { meta: httpInfo });
  debug('HTTP detayı:', httpInfo);
};

const logPerformance = (operation, duration, meta = {}) => {
  const perfInfo = {
    operation,
    duration,
    timestamp: new Date(),
    ...meta
  };

  logger.info('Performans metriği', { meta: perfInfo });
  debug('Performans detayı:', perfInfo);
};

const logSecurity = (event, userId = null, meta = {}) => {
  const securityInfo = {
    event,
    userId,
    timestamp: new Date(),
    ...meta
  };

  logger.warn('Güvenlik olayı', { meta: securityInfo });
  debug('Güvenlik detayı:', securityInfo);
};

const logDatabase = (operation, duration, meta = {}) => {
  const dbInfo = {
    operation,
    duration,
    timestamp: new Date(),
    ...meta
  };

  logger.info('Veritabanı operasyonu', { meta: dbInfo });
  debug('Veritabanı detayı:', dbInfo);
};

module.exports = {
  logger,
  logError,
  logActivity,
  logHttp,
  logPerformance,
  logSecurity,
  logDatabase
};
