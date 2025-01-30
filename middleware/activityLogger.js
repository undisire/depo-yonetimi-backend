const { logActivity } = require('../services/loggerService');
const debug = require('debug')('app:activity');

const activityLogger = (action) => {
  return (req, res, next) => {
    // Orijinal send fonksiyonunu kaydet
    const originalSend = res.send;

    // Response send olayını yakala
    res.send = function(...args) {
      // İşlem başarılıysa aktiviteyi logla
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id;
        const meta = {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body,
          statusCode: res.statusCode
        };

        // Aktiviteyi logla
        logActivity(action, userId, meta);

        // Debug modunda ekstra bilgi
        debug(`Kullanıcı ${userId}: ${action}`);
      }

      // Orijinal send fonksiyonunu çağır
      originalSend.apply(res, args);
    };

    next();
  };
};

// Önceden tanımlanmış aktivite tipleri
const ActivityTypes = {
  CREATE_MATERIAL: 'Malzeme oluşturuldu',
  UPDATE_MATERIAL: 'Malzeme güncellendi',
  DELETE_MATERIAL: 'Malzeme silindi',
  CREATE_REQUEST: 'Talep oluşturuldu',
  UPDATE_REQUEST: 'Talep güncellendi',
  DELETE_REQUEST: 'Talep silindi',
  CREATE_DELIVERY: 'Teslimat oluşturuldu',
  UPDATE_DELIVERY: 'Teslimat güncellendi',
  DELETE_DELIVERY: 'Teslimat silindi',
  CREATE_PROJECT: 'Proje oluşturuldu',
  UPDATE_PROJECT: 'Proje güncellendi',
  DELETE_PROJECT: 'Proje silindi',
  USER_LOGIN: 'Kullanıcı girişi yapıldı',
  USER_LOGOUT: 'Kullanıcı çıkışı yapıldı',
  USER_REGISTER: 'Yeni kullanıcı kaydı',
  USER_UPDATE: 'Kullanıcı bilgileri güncellendi',
  PASSWORD_CHANGE: 'Şifre değiştirildi',
  FILE_UPLOAD: 'Dosya yüklendi',
  FILE_DELETE: 'Dosya silindi',
  STOCK_UPDATE: 'Stok güncellendi',
  REPORT_GENERATED: 'Rapor oluşturuldu'
};

module.exports = {
  activityLogger,
  ActivityTypes
};
