const { logSecurity } = require('../services/loggerService');
const debug = require('debug')('app:security');
const rateLimit = require('express-rate-limit');

// Güvenlik olaylarını izle
const securityLogger = (event) => {
  return (req, res, next) => {
    const meta = {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('user-agent'),
      headers: req.headers,
      timestamp: new Date()
    };

    // Güvenlik olayını logla
    logSecurity(event, req.user?.id, meta);

    // Debug modunda ekstra bilgi
    debug(`Güvenlik olayı: ${event}`, meta);

    next();
  };
};

// Rate limiter oluştur
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // IP başına maksimum istek
    message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.',
    handler: (req, res) => {
      // Rate limit aşıldığında güvenlik olayını logla
      const meta = {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('user-agent')
      };

      logSecurity('RATE_LIMIT_EXCEEDED', req.user?.id, meta);
      debug('Rate limit aşıldı:', meta);

      res.status(429).json({
        error: {
          message: options.message || defaultOptions.message,
          status: 429,
          type: 'RateLimitExceeded'
        }
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Güvenlik olay tipleri
const SecurityEvents = {
  INVALID_TOKEN: 'Geçersiz token',
  EXPIRED_TOKEN: 'Süresi dolmuş token',
  UNAUTHORIZED_ACCESS: 'Yetkisiz erişim',
  INVALID_LOGIN: 'Başarısız giriş denemesi',
  SUCCESSFUL_LOGIN: 'Başarılı giriş',
  PASSWORD_CHANGE: 'Şifre değişikliği',
  ADMIN_ACTION: 'Yönetici işlemi',
  RATE_LIMIT_EXCEEDED: 'Rate limit aşıldı',
  SUSPICIOUS_IP: 'Şüpheli IP adresi',
  FILE_ACCESS: 'Dosya erişimi',
  SENSITIVE_DATA_ACCESS: 'Hassas veri erişimi',
  CONFIG_CHANGE: 'Yapılandırma değişikliği',
  USER_ROLE_CHANGE: 'Kullanıcı rolü değişikliği',
  API_KEY_USAGE: 'API anahtarı kullanımı'
};

module.exports = {
  securityLogger,
  createRateLimiter,
  SecurityEvents
};
