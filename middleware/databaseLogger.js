const { logDatabase } = require('../services/loggerService');
const debug = require('debug')('app:database');

const databaseLogger = (sequelize) => {
  // Sorgu başlangıç zamanlarını saklamak için Map
  const queryStartTimes = new Map();

  // Sorgu başladığında
  sequelize.addHook('beforeQuery', (options) => {
    const queryId = Math.random().toString(36).substring(7);
    queryStartTimes.set(queryId, process.hrtime());
    
    // Debug modunda SQL sorgusunu göster
    debug('SQL Sorgusu Başladı:', {
      sql: options.sql,
      queryId
    });

    // Query ID'yi options'a ekle
    options.queryId = queryId;
  });

  // Sorgu bittiğinde
  sequelize.addHook('afterQuery', (options) => {
    const queryId = options.queryId;
    const startTime = queryStartTimes.get(queryId);
    
    if (startTime) {
      // Sorgu süresini hesapla
      const diff = process.hrtime(startTime);
      const duration = (diff[0] * 1e9 + diff[1]) / 1e6; // Milisaniye cinsinden

      // Sorgu bilgilerini logla
      const meta = {
        sql: options.sql,
        parameters: options.bind,
        queryId,
        model: options.model?.name,
        transaction: !!options.transaction
      };

      logDatabase('SQL_QUERY', duration, meta);

      // Debug modunda sorgu süresini göster
      debug('SQL Sorgusu Tamamlandı:', {
        queryId,
        duration: `${duration}ms`
      });

      // Yavaş sorguları uyar
      if (duration > 1000) { // 1 saniyeden uzun süren sorgular
        debug(`⚠️ Yavaş sorgu tespit edildi - ${duration}ms:`, options.sql);
      }

      // Map'ten başlangıç zamanını temizle
      queryStartTimes.delete(queryId);
    }
  });

  return sequelize;
};

module.exports = databaseLogger;
