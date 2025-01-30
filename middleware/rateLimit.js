const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

// API rate limit yapılandırması
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum istek sayısı
  message: {
    error: {
      message: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.',
      status: 429
    }
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit aşıldı', {
      ip: req.ip,
      path: req.path,
      remainingTime: options.windowMs
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Auth rate limit yapılandırması
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5, // IP başına maksimum başarısız giriş denemesi
  message: {
    error: {
      message: 'Çok fazla başarısız giriş denemesi. Lütfen 1 saat sonra tekrar deneyin.',
      status: 429
    }
  },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit aşıldı', {
      ip: req.ip,
      path: req.path,
      remainingTime: options.windowMs
    });
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
