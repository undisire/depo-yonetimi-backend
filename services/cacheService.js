const Redis = require('ioredis');
const debug = require('debug')('app:cache');
const { logger } = require('./loggerService');

class CacheService {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('connect', () => {
      debug('Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.defaultTTL = 3600; // 1 saat
  }

  // Anahtar oluştur
  _createKey(prefix, identifier) {
    return `${prefix}:${identifier}`;
  }

  // Değer al
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Değer kaydet
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Değer sil
  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Öneki ile başlayan tüm anahtarları sil
  async delByPrefix(prefix) {
    try {
      const keys = await this.client.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete by prefix error:', error);
      return false;
    }
  }

  // Hash değeri al
  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  // Hash değeri kaydet
  async hset(key, field, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  }

  // Hash değeri sil
  async hdel(key, field) {
    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Cache hdel error:', error);
      return false;
    }
  }

  // Liste başına ekle
  async lpush(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.lpush(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache lpush error:', error);
      return false;
    }
  }

  // Liste sonuna ekle
  async rpush(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.rpush(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache rpush error:', error);
      return false;
    }
  }

  // Listeden değer al
  async lrange(key, start, stop) {
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error('Cache lrange error:', error);
      return [];
    }
  }

  // Kümeye ekle
  async sadd(key, ...values) {
    try {
      const serializedValues = values.map(value => JSON.stringify(value));
      await this.client.sadd(key, ...serializedValues);
      return true;
    } catch (error) {
      logger.error('Cache sadd error:', error);
      return false;
    }
  }

  // Kümeden değer sil
  async srem(key, ...values) {
    try {
      const serializedValues = values.map(value => JSON.stringify(value));
      await this.client.srem(key, ...serializedValues);
      return true;
    } catch (error) {
      logger.error('Cache srem error:', error);
      return false;
    }
  }

  // Küme üyeleri
  async smembers(key) {
    try {
      const values = await this.client.smembers(key);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error('Cache smembers error:', error);
      return [];
    }
  }

  // Sıralı kümeye ekle
  async zadd(key, score, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.zadd(key, score, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache zadd error:', error);
      return false;
    }
  }

  // Sıralı kümeden değer sil
  async zrem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.zrem(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache zrem error:', error);
      return false;
    }
  }

  // Sıralı küme üyeleri
  async zrange(key, start, stop, withScores = false) {
    try {
      const values = withScores
        ? await this.client.zrange(key, start, stop, 'WITHSCORES')
        : await this.client.zrange(key, start, stop);
      
      if (withScores) {
        const result = [];
        for (let i = 0; i < values.length; i += 2) {
          result.push({
            value: JSON.parse(values[i]),
            score: parseFloat(values[i + 1])
          });
        }
        return result;
      }

      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error('Cache zrange error:', error);
      return [];
    }
  }

  // Anahtarın süresini güncelle
  async expire(key, ttl) {
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  // Anahtarın süresini al
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Cache ttl error:', error);
      return -2;
    }
  }

  // Önbellekte anahtar var mı?
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Tüm önbelleği temizle
  async flush() {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // İstatistikleri al
  async getStats() {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
