const { logError } = require('../services/loggerService');
const debug = require('debug')('app:error');

// Özel hata sınıfları
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.status = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

// Ana hata işleme middleware'i
const errorHandler = (err, req, res, next) => {
  // Debug modunda hata detayını göster
  debug('Hata yakalandı:', err);

  // Hata logla
  logError(err, req.user?.id, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    params: req.params
  });

  // Sequelize validasyon hatalarını özelleştir
  if (err.name === 'SequelizeValidationError') {
    const validationError = new ValidationError('Validation Error', 
      err.errors.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    );
    return handleError(validationError, req, res);
  }

  // Sequelize benzersizlik hatalarını özelleştir
  if (err.name === 'SequelizeUniqueConstraintError') {
    const validationError = new ValidationError('Unique Constraint Error',
      err.errors.map(e => ({
        field: e.path,
        message: `${e.path} must be unique`,
        value: e.value
      }))
    );
    return handleError(validationError, req, res);
  }

  // JWT hatalarını özelleştir
  if (err.name === 'JsonWebTokenError') {
    const authError = new AuthenticationError('Invalid token');
    return handleError(authError, req, res);
  }

  // JWT süresi dolma hatalarını özelleştir
  if (err.name === 'TokenExpiredError') {
    const authError = new AuthenticationError('Token expired');
    return handleError(authError, req, res);
  }

  // Diğer tüm hataları işle
  handleError(err, req, res);
};

// Hata yanıtı oluştur
const handleError = (err, req, res) => {
  const status = err.status || 500;
  const response = {
    error: {
      message: err.message,
      status: status,
      type: err.name
    }
  };

  // Validasyon hatalarında detayları ekle
  if (err instanceof ValidationError) {
    response.error.details = err.errors;
  }

  // Production modunda stack trace'i gizle
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
};

// 404 hata işleyici
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};
