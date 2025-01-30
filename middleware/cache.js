const cacheService = require('../services/cacheService');
const debug = require('debug')('app:cache');
const { logger } = require('../services/loggerService');

// Önbellek anahtarı oluştur
const createCacheKey = (req) => {
  const { baseUrl, path, query, body } = req;
  const queryString = Object.keys(query).length ? JSON.stringify(query) : '';
  const bodyString = Object.keys(body).length ? JSON.stringify(body) : '';
  return `api:${baseUrl}${path}:${queryString}:${bodyString}`;
};

// Önbellek middleware'i
const cache = (duration = 3600) => {
  return async (req, res, next) => {
    // Sadece GET isteklerini önbellekle
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.customCacheKey || createCacheKey(req);

    try {
      // Önbellekten veriyi al
      const cachedData = await cacheService.get(key);

      if (cachedData) {
        debug(`Cache hit: ${key}`);
        return res.json(cachedData);
      }

      // Orijinal json metodunu sakla
      const originalJson = res.json;

      // Json metodunu override et
      res.json = function(data) {
        // Veriyi önbelleğe kaydet
        cacheService.set(key, data, req.cacheDuration || duration);
        debug(`Cache set: ${key}`);

        // Orijinal json metodunu çağır
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Önbellek temizleme middleware'i
const clearCache = (prefix) => {
  return async (req, res, next) => {
    try {
      // İstek tamamlandıktan sonra önbelleği temizle
      res.on('finish', async () => {
        if (prefix) {
          await cacheService.delByPrefix(prefix);
          debug(`Cache cleared with prefix: ${prefix}`);
        }
      });

      next();
    } catch (error) {
      logger.error('Clear cache middleware error:', error);
      next();
    }
  };
};

// Önbellek bypass middleware'i
const bypassCache = () => {
  return (req, res, next) => {
    req.bypassCache = true;
    next();
  };
};

// Koşullu önbellekleme middleware'i
const conditionalCache = (condition, duration = 3600) => {
  return async (req, res, next) => {
    if (!condition(req)) {
      return next();
    }

    return cache(duration)(req, res, next);
  };
};

// Önbellek istatistikleri middleware'i
const cacheStats = () => {
  return async (req, res, next) => {
    try {
      const stats = await cacheService.getStats();
      req.cacheStats = stats;
      next();
    } catch (error) {
      logger.error('Cache stats middleware error:', error);
      next();
    }
  };
};

// Önbellek süresi ayarlama middleware'i
const setCacheDuration = (duration) => {
  return (req, res, next) => {
    req.cacheDuration = duration;
    next();
  };
};

// Önbellek anahtarı özelleştirme middleware'i
const customCacheKey = (keyGenerator) => {
  return (req, res, next) => {
    req.customCacheKey = keyGenerator(req);
    next();
  };
};

// Önbellek grubu middleware'i
const cacheGroup = (group) => {
  return (req, res, next) => {
    req.cacheGroup = group;
    next();
  };
};

module.exports = {
  cache,
  clearCache,
  bypassCache,
  conditionalCache,
  cacheStats,
  setCacheDuration,
  customCacheKey,
  cacheGroup
};
