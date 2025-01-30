const debug = require('debug')('app:statistics');
const { logger } = require('./loggerService');
const { Material, Request, Delivery, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const cacheService = require('./cacheService');

class StatisticsService {
  constructor() {
    moment.tz.setDefault('Europe/Istanbul');
  }

  // Stok istatistiklerini getir
  async getStockStats() {
    try {
      const cacheKey = 'stock_stats';
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const materials = await Material.findAll({
        include: ['category']
      });

      const stats = {
        totalStock: materials.reduce((sum, m) => sum + m.stock_qty, 0),
        lowStock: materials.filter(m => m.stock_qty <= m.min_stock_qty).length,
        outOfStock: materials.filter(m => m.stock_qty === 0).length,
        byCategory: {},
        topMaterials: []
      };

      // Kategori bazlı istatistikler
      materials.forEach(material => {
        const category = material.category?.name || 'Diğer';
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = {
            total: 0,
            count: 0,
            lowStock: 0,
            outOfStock: 0
          };
        }
        stats.byCategory[category].total += material.stock_qty;
        stats.byCategory[category].count++;
        if (material.stock_qty <= material.min_stock_qty) {
          stats.byCategory[category].lowStock++;
        }
        if (material.stock_qty === 0) {
          stats.byCategory[category].outOfStock++;
        }
      });

      // En çok kullanılan malzemeler
      stats.topMaterials = materials
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10)
        .map(m => ({
          code: m.code,
          name: m.name,
          usageCount: m.usage_count,
          stock: m.stock_qty
        }));

      await cacheService.set(cacheKey, stats, 3600); // 1 saat cache
      return stats;
    } catch (error) {
      logger.error('Error getting stock stats:', error);
      throw error;
    }
  }

  // Talep istatistiklerini getir
  async getRequestStats(startDate, endDate) {
    try {
      const cacheKey = `request_stats_${startDate}_${endDate}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [startDate, endDate]
        };
      }

      const requests = await Request.findAll({
        where: whereClause,
        include: ['requestedBy', 'materials']
      });

      const stats = {
        total: requests.length,
        byStatus: {},
        byPriority: {},
        byUser: {},
        byMaterial: {},
        timeline: {}
      };

      // Durum ve öncelik bazlı istatistikler
      requests.forEach(request => {
        // Durum istatistikleri
        if (!stats.byStatus[request.status]) {
          stats.byStatus[request.status] = 0;
        }
        stats.byStatus[request.status]++;

        // Öncelik istatistikleri
        if (!stats.byPriority[request.priority]) {
          stats.byPriority[request.priority] = 0;
        }
        stats.byPriority[request.priority]++;

        // Kullanıcı bazlı istatistikler
        const username = request.requestedBy?.username || 'Bilinmeyen';
        if (!stats.byUser[username]) {
          stats.byUser[username] = {
            total: 0,
            byStatus: {},
            byPriority: {}
          };
        }
        stats.byUser[username].total++;
        if (!stats.byUser[username].byStatus[request.status]) {
          stats.byUser[username].byStatus[request.status] = 0;
        }
        stats.byUser[username].byStatus[request.status]++;
        if (!stats.byUser[username].byPriority[request.priority]) {
          stats.byUser[username].byPriority[request.priority] = 0;
        }
        stats.byUser[username].byPriority[request.priority]++;

        // Malzeme bazlı istatistikler
        request.materials.forEach(material => {
          if (!stats.byMaterial[material.code]) {
            stats.byMaterial[material.code] = {
              name: material.name,
              total: 0,
              quantity: 0
            };
          }
          stats.byMaterial[material.code].total++;
          stats.byMaterial[material.code].quantity += material.RequestMaterial.quantity;
        });

        // Zaman çizelgesi
        const date = moment(request.created_at).format('YYYY-MM-DD');
        if (!stats.timeline[date]) {
          stats.timeline[date] = {
            total: 0,
            byStatus: {},
            byPriority: {}
          };
        }
        stats.timeline[date].total++;
        if (!stats.timeline[date].byStatus[request.status]) {
          stats.timeline[date].byStatus[request.status] = 0;
        }
        stats.timeline[date].byStatus[request.status]++;
        if (!stats.timeline[date].byPriority[request.priority]) {
          stats.timeline[date].byPriority[request.priority] = 0;
        }
        stats.timeline[date].byPriority[request.priority]++;
      });

      await cacheService.set(cacheKey, stats, 3600); // 1 saat cache
      return stats;
    } catch (error) {
      logger.error('Error getting request stats:', error);
      throw error;
    }
  }

  // Teslimat istatistiklerini getir
  async getDeliveryStats(startDate, endDate) {
    try {
      const cacheKey = `delivery_stats_${startDate}_${endDate}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [startDate, endDate]
        };
      }

      const deliveries = await Delivery.findAll({
        where: whereClause,
        include: ['deliveredBy', 'receivedBy', 'request']
      });

      const stats = {
        total: deliveries.length,
        byStatus: {},
        byUser: {},
        performance: {
          onTime: 0,
          delayed: 0,
          averageDelay: 0
        },
        timeline: {}
      };

      let totalDelay = 0;
      let delayedCount = 0;

      deliveries.forEach(delivery => {
        // Durum istatistikleri
        if (!stats.byStatus[delivery.status]) {
          stats.byStatus[delivery.status] = 0;
        }
        stats.byStatus[delivery.status]++;

        // Kullanıcı bazlı istatistikler
        const deliveredBy = delivery.deliveredBy?.username || 'Bilinmeyen';
        if (!stats.byUser[deliveredBy]) {
          stats.byUser[deliveredBy] = {
            total: 0,
            byStatus: {},
            performance: {
              onTime: 0,
              delayed: 0
            }
          };
        }
        stats.byUser[deliveredBy].total++;
        if (!stats.byUser[deliveredBy].byStatus[delivery.status]) {
          stats.byUser[deliveredBy].byStatus[delivery.status] = 0;
        }
        stats.byUser[deliveredBy].byStatus[delivery.status]++;

        // Performans istatistikleri
        if (delivery.expected_date && delivery.delivery_date) {
          const expectedDate = moment(delivery.expected_date);
          const deliveryDate = moment(delivery.delivery_date);
          const delay = deliveryDate.diff(expectedDate, 'hours');

          if (delay > 0) {
            stats.performance.delayed++;
            stats.byUser[deliveredBy].performance.delayed++;
            totalDelay += delay;
            delayedCount++;
          } else {
            stats.performance.onTime++;
            stats.byUser[deliveredBy].performance.onTime++;
          }
        }

        // Zaman çizelgesi
        const date = moment(delivery.created_at).format('YYYY-MM-DD');
        if (!stats.timeline[date]) {
          stats.timeline[date] = {
            total: 0,
            byStatus: {},
            performance: {
              onTime: 0,
              delayed: 0
            }
          };
        }
        stats.timeline[date].total++;
        if (!stats.timeline[date].byStatus[delivery.status]) {
          stats.timeline[date].byStatus[delivery.status] = 0;
        }
        stats.timeline[date].byStatus[delivery.status]++;
      });

      // Ortalama gecikme hesapla
      stats.performance.averageDelay = delayedCount > 0 ? Math.round(totalDelay / delayedCount) : 0;

      await cacheService.set(cacheKey, stats, 3600); // 1 saat cache
      return stats;
    } catch (error) {
      logger.error('Error getting delivery stats:', error);
      throw error;
    }
  }

  // Kullanıcı istatistiklerini getir
  async getUserStats() {
    try {
      const cacheKey = 'user_stats';
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const users = await User.findAll({
        include: [
          {
            model: Request,
            as: 'requests'
          },
          {
            model: Delivery,
            as: 'deliveries'
          }
        ]
      });

      const stats = {
        total: users.length,
        byRole: {},
        byDepartment: {},
        activity: {
          lastDay: 0,
          lastWeek: 0,
          lastMonth: 0
        },
        performance: {}
      };

      const now = moment();
      const lastDay = now.clone().subtract(1, 'day');
      const lastWeek = now.clone().subtract(1, 'week');
      const lastMonth = now.clone().subtract(1, 'month');

      users.forEach(user => {
        // Rol bazlı istatistikler
        if (!stats.byRole[user.role]) {
          stats.byRole[user.role] = 0;
        }
        stats.byRole[user.role]++;

        // Departman bazlı istatistikler
        if (!stats.byDepartment[user.department]) {
          stats.byDepartment[user.department] = 0;
        }
        stats.byDepartment[user.department]++;

        // Aktivite istatistikleri
        const lastLoginDate = moment(user.last_login);
        if (lastLoginDate.isAfter(lastDay)) {
          stats.activity.lastDay++;
        }
        if (lastLoginDate.isAfter(lastWeek)) {
          stats.activity.lastWeek++;
        }
        if (lastLoginDate.isAfter(lastMonth)) {
          stats.activity.lastMonth++;
        }

        // Performans istatistikleri
        stats.performance[user.username] = {
          requests: {
            total: user.requests.length,
            byStatus: {},
            byPriority: {}
          },
          deliveries: {
            total: user.deliveries.length,
            byStatus: {},
            performance: {
              onTime: 0,
              delayed: 0
            }
          }
        };

        // Talep istatistikleri
        user.requests.forEach(request => {
          if (!stats.performance[user.username].requests.byStatus[request.status]) {
            stats.performance[user.username].requests.byStatus[request.status] = 0;
          }
          stats.performance[user.username].requests.byStatus[request.status]++;

          if (!stats.performance[user.username].requests.byPriority[request.priority]) {
            stats.performance[user.username].requests.byPriority[request.priority] = 0;
          }
          stats.performance[user.username].requests.byPriority[request.priority]++;
        });

        // Teslimat istatistikleri
        user.deliveries.forEach(delivery => {
          if (!stats.performance[user.username].deliveries.byStatus[delivery.status]) {
            stats.performance[user.username].deliveries.byStatus[delivery.status] = 0;
          }
          stats.performance[user.username].deliveries.byStatus[delivery.status]++;

          if (delivery.expected_date && delivery.delivery_date) {
            const expectedDate = moment(delivery.expected_date);
            const deliveryDate = moment(delivery.delivery_date);
            if (deliveryDate.isAfter(expectedDate)) {
              stats.performance[user.username].deliveries.performance.delayed++;
            } else {
              stats.performance[user.username].deliveries.performance.onTime++;
            }
          }
        });
      });

      await cacheService.set(cacheKey, stats, 3600); // 1 saat cache
      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}

// Singleton instance
const statisticsService = new StatisticsService();

module.exports = statisticsService;
