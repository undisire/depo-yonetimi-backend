// Çevresel değişkenleri yükle (.env dosyasından)
require('dotenv').config();

// Gerekli modülleri içe aktar
const express = require('express');
const cors = require('cors');
const http = require('http');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { logger, logError } = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const setupSocket = require('./config/socket');
const NotificationService = require('./services/notificationService');
const path = require('path');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { apiLimiter } = require('./middleware/rateLimit');
const { securityLogger, createRateLimiter } = require('./middleware/securityLogger');
const { performanceMonitor, OperationTypes } = require('./middleware/performanceMonitor');
const databaseLogger = require('./middleware/databaseLogger');
const socketService = require('./services/socketService');

// Modelleri içe aktar
const Project = require('./models/Project');
const Material = require('./models/Material');
const Request = require('./models/Request');
const Delivery = require('./models/Delivery');

// Model ilişkilerini tanımla
Request.belongsTo(Project, {
  foreignKey: 'projectId',
  targetKey: 'id'
});

Request.belongsTo(Material, {
  foreignKey: 'materialId',
  targetKey: 'id'
});

Project.hasMany(Request, {
  foreignKey: 'projectId',
  sourceKey: 'id'
});

Material.hasMany(Request, {
  foreignKey: 'materialId',
  sourceKey: 'id'
});

Request.hasOne(Delivery, {
  foreignKey: 'requestId',
  sourceKey: 'id'
});

Delivery.belongsTo(Request, {
  foreignKey: 'requestId',
  targetKey: 'id'
});

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);
const io = setupSocket(server);

// Notification service'i oluştur
const notificationService = new NotificationService(io);
app.set('notificationService', notificationService);

// Request loglama middleware'i
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware'leri ayarla
app.use(cors());
app.use(express.json());
app.use(compression()); // GZIP sıkıştırma
app.use(requestLogger);
app.use(apiLimiter); // Rate limiting
app.use(createRateLimiter());

// Veritabanı logger'ını başlat
databaseLogger(sequelize);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Depo Yönetim Sistemi API',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    displayRequestDuration: true
  }
}));

// Statik dosya sunumu
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Tarayıcı cache süresi
  etag: true, // ETag desteği
  lastModified: true // Son değişiklik tarihi
}));

// Security headers
app.use((req, res, next) => {
  // XSS koruması
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Clickjacking koruması
  res.setHeader('X-Frame-Options', 'DENY');
  // MIME type sniffing koruması
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Route'ları içe aktar
const projectRoutes = require('./routes/projects');
const materialRoutes = require('./routes/materials');
const requestRoutes = require('./routes/requests');
const deliveryRoutes = require('./routes/deliveries');
const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const notificationsRoutes = require('./routes/notifications');
const filesRoutes = require('./routes/files');
const statisticsRoutes = require('./routes/statistics');

// Route'ları kullan
app.use('/api/projects', performanceMonitor(OperationTypes.LIST_PROJECTS), projectRoutes);
app.use('/api/materials', performanceMonitor(OperationTypes.LIST_MATERIALS), materialRoutes);
app.use('/api/requests', performanceMonitor(OperationTypes.LIST_REQUESTS), requestRoutes);
app.use('/api/deliveries', performanceMonitor(OperationTypes.LIST_DELIVERIES), deliveryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', performanceMonitor(OperationTypes.GENERATE_REPORT), reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/files', performanceMonitor(OperationTypes.FILE_UPLOAD), filesRoutes);
app.use('/api/statistics', statisticsRoutes);

// 404 handler
app.use((req, res, next) => {
  const error = new Error('Sayfa bulunamadı');
  error.status = 404;
  next(error);
});

// Hata yakalama middleware'i
app.use((err, req, res, next) => {
  logError(err, req.user?.id, {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body
  });

  console.error(err);
  
  const status = err.status || 500;
  const message = err.message || 'Sunucu hatası';
  
  res.status(status).json({
    error: {
      message,
      status,
      details: err.details || null,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
});

// WebSocket başlatma
socketService.initialize(server);

// Port
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date()
  });
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
  console.log(`📝 API endpoint: http://localhost:${PORT}`);
});

// Beklenmeyen hataları yakala
process.on('unhandledRejection', (error) => {
  console.error('Yakalanmamış Promise Hatası:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Yakalanmamış Hata:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Veritabanı bağlantısını kapat
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});