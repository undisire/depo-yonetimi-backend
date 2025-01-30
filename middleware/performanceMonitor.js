const { logPerformance } = require('../services/loggerService');
const debug = require('debug')('app:performance');

const performanceMonitor = (operation) => {
  return (req, res, next) => {
    const start = process.hrtime();

    // Orijinal send fonksiyonunu kaydet
    const originalSend = res.send;

    // Response send olayını yakala
    res.send = function(...args) {
      // İşlem süresini hesapla
      const diff = process.hrtime(start);
      const duration = (diff[0] * 1e9 + diff[1]) / 1e6; // Milisaniye cinsinden

      // Performans metriğini logla
      const meta = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userId: req.user?.id,
        query: req.query,
        params: req.params
      };

      logPerformance(operation, duration, meta);

      // Debug modunda ekstra bilgi
      debug(`${operation}: ${duration}ms`);

      // Yavaş istekleri uyar
      if (duration > 1000) { // 1 saniyeden uzun süren istekler
        debug(`⚠️ Yavaş istek tespit edildi: ${operation} - ${duration}ms`);
      }

      // Orijinal send fonksiyonunu çağır
      originalSend.apply(res, args);
    };

    next();
  };
};

// Önceden tanımlanmış operasyon tipleri
const OperationTypes = {
  LIST_MATERIALS: 'Malzeme Listesi',
  GET_MATERIAL: 'Malzeme Detay',
  CREATE_MATERIAL: 'Malzeme Oluşturma',
  UPDATE_MATERIAL: 'Malzeme Güncelleme',
  DELETE_MATERIAL: 'Malzeme Silme',
  LIST_REQUESTS: 'Talep Listesi',
  GET_REQUEST: 'Talep Detay',
  CREATE_REQUEST: 'Talep Oluşturma',
  UPDATE_REQUEST: 'Talep Güncelleme',
  DELETE_REQUEST: 'Talep Silme',
  LIST_DELIVERIES: 'Teslimat Listesi',
  GET_DELIVERY: 'Teslimat Detay',
  CREATE_DELIVERY: 'Teslimat Oluşturma',
  UPDATE_DELIVERY: 'Teslimat Güncelleme',
  DELETE_DELIVERY: 'Teslimat Silme',
  GENERATE_REPORT: 'Rapor Oluşturma',
  FILE_UPLOAD: 'Dosya Yükleme',
  FILE_DOWNLOAD: 'Dosya İndirme',
  SEARCH_OPERATION: 'Arama İşlemi',
  DATABASE_QUERY: 'Veritabanı Sorgusu'
};

module.exports = {
  performanceMonitor,
  OperationTypes
};
