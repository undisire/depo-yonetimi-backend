const { Op } = require('sequelize');
const debug = require('debug')('app:search');
const { logger } = require('./loggerService');
const cacheService = require('./cacheService');
const { Material, Request, Delivery, User, Category } = require('../models');

class SearchService {
  constructor() {
    this.searchableModels = {
      material: Material,
      request: Request,
      delivery: Delivery,
      user: User,
      category: Category
    };

    this.searchableFields = {
      material: ['name', 'code', 'description', 'location', 'supplier'],
      request: ['status', 'priority', 'notes'],
      delivery: ['status', 'tracking_number', 'notes'],
      user: ['username', 'email', 'full_name', 'department'],
      category: ['name', 'description']
    };

    this.sortableFields = {
      material: ['name', 'code', 'stock_qty', 'min_stock_qty', 'created_at'],
      request: ['status', 'priority', 'created_at', 'updated_at'],
      delivery: ['status', 'created_at', 'delivery_date'],
      user: ['username', 'created_at', 'last_login'],
      category: ['name', 'created_at']
    };

    this.filterableFields = {
      material: {
        stock_qty: 'number',
        min_stock_qty: 'number',
        location: 'string',
        supplier: 'string',
        category_id: 'number',
        created_at: 'date'
      },
      request: {
        status: 'enum',
        priority: 'enum',
        requested_by: 'number',
        approved_by: 'number',
        created_at: 'date'
      },
      delivery: {
        status: 'enum',
        delivered_by: 'number',
        received_by: 'number',
        delivery_date: 'date',
        created_at: 'date'
      },
      user: {
        role: 'enum',
        department: 'string',
        is_active: 'boolean',
        created_at: 'date',
        last_login: 'date'
      },
      category: {
        parent_id: 'number',
        created_at: 'date'
      }
    };
  }

  // Arama yap
  async search(modelName, params) {
    try {
      const model = this.searchableModels[modelName];
      if (!model) {
        throw new Error(`Invalid model name: ${modelName}`);
      }

      // Önbellekten kontrol et
      const cacheKey = this.generateCacheKey(modelName, params);
      const cachedResults = await cacheService.get(cacheKey);
      if (cachedResults) {
        debug(`Cache hit for ${cacheKey}`);
        return cachedResults;
      }

      // Arama parametrelerini oluştur
      const query = this.buildSearchQuery(modelName, params);

      // Arama yap
      const results = await model.findAndCountAll(query);

      // Sonuçları önbelleğe al
      await cacheService.set(cacheKey, results, 300); // 5 dakika

      return results;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  // Arama sorgusu oluştur
  buildSearchQuery(modelName, params) {
    const query = {
      where: {},
      include: this.getIncludes(modelName),
      distinct: true
    };

    // Arama terimini işle
    if (params.search) {
      query.where[Op.or] = this.buildSearchConditions(modelName, params.search);
    }

    // Filtreleri işle
    if (params.filters) {
      Object.assign(query.where, this.buildFilterConditions(modelName, params.filters));
    }

    // Sıralamayı işle
    if (params.sort) {
      query.order = this.buildSortConditions(modelName, params.sort);
    }

    // Sayfalamayı işle
    if (params.page && params.limit) {
      query.offset = (params.page - 1) * params.limit;
      query.limit = params.limit;
    }

    return query;
  }

  // Arama koşullarını oluştur
  buildSearchConditions(modelName, searchTerm) {
    const searchableFields = this.searchableFields[modelName];
    return searchableFields.map(field => ({
      [field]: {
        [Op.iLike]: `%${searchTerm}%`
      }
    }));
  }

  // Filtre koşullarını oluştur
  buildFilterConditions(modelName, filters) {
    const conditions = {};
    const filterableFields = this.filterableFields[modelName];

    for (const [field, value] of Object.entries(filters)) {
      if (filterableFields[field]) {
        switch (filterableFields[field]) {
          case 'string':
            conditions[field] = {
              [Op.iLike]: `%${value}%`
            };
            break;
          case 'number':
            if (typeof value === 'object') {
              const numericConditions = {};
              if (value.min !== undefined) {
                numericConditions[Op.gte] = value.min;
              }
              if (value.max !== undefined) {
                numericConditions[Op.lte] = value.max;
              }
              conditions[field] = numericConditions;
            } else {
              conditions[field] = value;
            }
            break;
          case 'boolean':
            conditions[field] = value;
            break;
          case 'date':
            if (typeof value === 'object') {
              const dateConditions = {};
              if (value.start) {
                dateConditions[Op.gte] = new Date(value.start);
              }
              if (value.end) {
                dateConditions[Op.lte] = new Date(value.end);
              }
              conditions[field] = dateConditions;
            } else {
              conditions[field] = new Date(value);
            }
            break;
          case 'enum':
            if (Array.isArray(value)) {
              conditions[field] = {
                [Op.in]: value
              };
            } else {
              conditions[field] = value;
            }
            break;
        }
      }
    }

    return conditions;
  }

  // Sıralama koşullarını oluştur
  buildSortConditions(modelName, sort) {
    const sortableFields = this.sortableFields[modelName];
    const orders = [];

    if (typeof sort === 'string') {
      const [field, direction] = sort.split(':');
      if (sortableFields.includes(field)) {
        orders.push([field, direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']);
      }
    } else if (Array.isArray(sort)) {
      for (const sortItem of sort) {
        const [field, direction] = sortItem.split(':');
        if (sortableFields.includes(field)) {
          orders.push([field, direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']);
        }
      }
    }

    return orders;
  }

  // İlişkili modelleri al
  getIncludes(modelName) {
    const includes = [];

    switch (modelName) {
      case 'material':
        includes.push(
          { model: Category, as: 'category' }
        );
        break;
      case 'request':
        includes.push(
          { model: User, as: 'requestedBy' },
          { model: User, as: 'approvedBy' },
          { model: Material, as: 'materials' }
        );
        break;
      case 'delivery':
        includes.push(
          { model: User, as: 'deliveredBy' },
          { model: User, as: 'receivedBy' },
          { model: Request, as: 'request' }
        );
        break;
      case 'user':
        // Gerekli ilişkiler eklenebilir
        break;
      case 'category':
        includes.push(
          { model: Category, as: 'parent' },
          { model: Category, as: 'children' }
        );
        break;
    }

    return includes;
  }

  // Önbellek anahtarı oluştur
  generateCacheKey(modelName, params) {
    return `search:${modelName}:${JSON.stringify(params)}`;
  }

  // Arama önerilerini al
  async getSuggestions(modelName, field, prefix, limit = 10) {
    try {
      const model = this.searchableModels[modelName];
      if (!model) {
        throw new Error(`Invalid model name: ${modelName}`);
      }

      const cacheKey = `suggestions:${modelName}:${field}:${prefix}`;
      const cachedSuggestions = await cacheService.get(cacheKey);
      if (cachedSuggestions) {
        return cachedSuggestions;
      }

      const results = await model.findAll({
        attributes: [field],
        where: {
          [field]: {
            [Op.iLike]: `${prefix}%`
          }
        },
        group: [field],
        limit
      });

      const suggestions = results.map(result => result[field]);
      await cacheService.set(cacheKey, suggestions, 300); // 5 dakika

      return suggestions;
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  // Arama geçmişini kaydet
  async saveSearchHistory(userId, modelName, searchTerm) {
    try {
      const cacheKey = `search_history:${userId}`;
      let history = await cacheService.get(cacheKey) || [];

      // Yeni aramayı ekle
      history.unshift({
        modelName,
        searchTerm,
        timestamp: new Date()
      });

      // Son 100 aramayı tut
      history = history.slice(0, 100);

      await cacheService.set(cacheKey, history, 86400); // 24 saat
    } catch (error) {
      logger.error('Failed to save search history:', error);
    }
  }

  // Arama geçmişini al
  async getSearchHistory(userId, limit = 10) {
    try {
      const cacheKey = `search_history:${userId}`;
      const history = await cacheService.get(cacheKey) || [];
      return history.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get search history:', error);
      throw error;
    }
  }

  // Arama geçmişini temizle
  async clearSearchHistory(userId) {
    try {
      const cacheKey = `search_history:${userId}`;
      await cacheService.del(cacheKey);
    } catch (error) {
      logger.error('Failed to clear search history:', error);
      throw error;
    }
  }

  // Popüler aramaları al
  async getPopularSearches(modelName, timeframe = '24h', limit = 10) {
    try {
      const cacheKey = `popular_searches:${modelName}:${timeframe}`;
      let popularSearches = await cacheService.get(cacheKey);

      if (!popularSearches) {
        // Gerçek uygulamada bu veriler bir analitik servisinden alınabilir
        popularSearches = [];
        await cacheService.set(cacheKey, popularSearches, 3600); // 1 saat
      }

      return popularSearches.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get popular searches:', error);
      throw error;
    }
  }
}

// Singleton instance
const searchService = new SearchService();

module.exports = searchService;
