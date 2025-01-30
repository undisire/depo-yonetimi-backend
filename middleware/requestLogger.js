const { logHttp } = require('../services/loggerService');
const debug = require('debug')('app:http');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Orijinal end fonksiyonunu kaydet
  const originalEnd = res.end;

  // Response end olayını yakala
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    
    // HTTP isteğini logla
    logHttp(req, res, responseTime);

    // Debug modunda ekstra bilgi
    debug(`${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`);

    // Orijinal end fonksiyonunu çağır
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestLogger;
