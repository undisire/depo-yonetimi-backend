const schedule = require('node-schedule');
const cron = require('node-cron');
const debug = require('debug')('app:scheduler');
const { logger } = require('./loggerService');
const workerService = require('./workerService');
const emailService = require('./emailService');
const reportService = require('./reportService');
const cacheService = require('./cacheService');
const { User, Material, Request, Delivery } = require('../models');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initialize();
  }

  // Zamanlayıcıları başlat
  async initialize() {
    try {
      // Sistem görevleri
      this.scheduleSystemTasks();

      // Rapor görevleri
      this.scheduleReportTasks();

      // Bakım görevleri
      this.scheduleMaintenanceTasks();

      // Bildirim görevleri
      this.scheduleNotificationTasks();

      debug('Scheduler service initialized');
    } catch (error) {
      logger.error('Scheduler service initialization failed:', error);
      throw error;
    }
  }

  // Sistem görevlerini zamanla
  scheduleSystemTasks() {
    // Her gece yarısı veritabanı yedekleme
    this.schedule('database-backup', '0 0 * * *', async () => {
      try {
        await workerService.addJob('sync', 'database', {
          operation: 'backup',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Database backup failed:', error);
      }
    });

    // Her saat başı önbellek temizliği
    this.schedule('cache-cleanup', '0 * * * *', async () => {
      try {
        await workerService.addJob('cleanup', 'cache', {
          operation: 'cleanup',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Cache cleanup failed:', error);
      }
    });

    // Her gün saat 02:00'de log rotasyonu
    this.schedule('log-rotation', '0 2 * * *', async () => {
      try {
        await workerService.addJob('cleanup', 'logs', {
          operation: 'rotate',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Log rotation failed:', error);
      }
    });
  }

  // Rapor görevlerini zamanla
  scheduleReportTasks() {
    // Her gün saat 08:00'de günlük stok raporu
    this.schedule('daily-stock-report', '0 8 * * *', async () => {
      try {
        const materials = await Material.findAll();
        const report = await reportService.createStockReport(materials, 'pdf');
        
        const admins = await User.findAll({
          where: { role: 'admin' }
        });

        for (const admin of admins) {
          await emailService.sendReport(report, admin);
        }
      } catch (error) {
        logger.error('Daily stock report failed:', error);
      }
    });

    // Her Pazartesi saat 09:00'da haftalık aktivite raporu
    this.schedule('weekly-activity-report', '0 9 * * 1', async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const [requests, deliveries] = await Promise.all([
          Request.findAll({
            where: {
              createdAt: {
                [Op.gte]: startDate
              }
            }
          }),
          Delivery.findAll({
            where: {
              createdAt: {
                [Op.gte]: startDate
              }
            }
          })
        ]);

        const report = await reportService.createActivityReport({
          requests,
          deliveries,
          startDate,
          endDate: new Date()
        }, 'pdf');

        const managers = await User.findAll({
          where: {
            role: {
              [Op.in]: ['admin', 'manager']
            }
          }
        });

        for (const manager of managers) {
          await emailService.sendReport(report, manager);
        }
      } catch (error) {
        logger.error('Weekly activity report failed:', error);
      }
    });
  }

  // Bakım görevlerini zamanla
  scheduleMaintenanceTasks() {
    // Her gün saat 03:00'de geçici dosyaları temizle
    this.schedule('temp-cleanup', '0 3 * * *', async () => {
      try {
        await workerService.addJob('cleanup', 'temp', {
          operation: 'cleanup',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Temp cleanup failed:', error);
      }
    });

    // Her Pazar saat 04:00'de veritabanı optimizasyonu
    this.schedule('database-optimize', '0 4 * * 0', async () => {
      try {
        await workerService.addJob('sync', 'database', {
          operation: 'optimize',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Database optimization failed:', error);
      }
    });

    // Her ayın ilk günü saat 05:00'de arşivleme
    this.schedule('monthly-archive', '0 5 1 * *', async () => {
      try {
        await workerService.addJob('sync', 'files', {
          operation: 'archive',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Monthly archive failed:', error);
      }
    });
  }

  // Bildirim görevlerini zamanla
  scheduleNotificationTasks() {
    // Her saat başı düşük stok kontrolü
    this.schedule('low-stock-check', '0 * * * *', async () => {
      try {
        const lowStockMaterials = await Material.findAll({
          where: {
            stock_qty: {
              [Op.lt]: sequelize.col('min_stock_qty')
            }
          }
        });

        if (lowStockMaterials.length > 0) {
          const admins = await User.findAll({
            where: { role: 'admin' }
          });

          for (const material of lowStockMaterials) {
            for (const admin of admins) {
              await emailService.sendLowStockAlert(material, admin);
            }
          }
        }
      } catch (error) {
        logger.error('Low stock check failed:', error);
      }
    });

    // Her gün saat 17:00'de bekleyen talepleri kontrol et
    this.schedule('pending-requests-check', '0 17 * * *', async () => {
      try {
        const pendingRequests = await Request.findAll({
          where: {
            status: 'pending',
            createdAt: {
              [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          include: [
            { model: User, as: 'requestedBy' },
            { model: Material }
          ]
        });

        if (pendingRequests.length > 0) {
          const admins = await User.findAll({
            where: { role: 'admin' }
          });

          for (const request of pendingRequests) {
            for (const admin of admins) {
              await emailService.sendRequestReminder(request, admin);
            }
          }
        }
      } catch (error) {
        logger.error('Pending requests check failed:', error);
      }
    });
  }

  // Görev zamanlama
  schedule(name, cronExpression, task) {
    try {
      // Varolan görevi iptal et
      if (this.jobs.has(name)) {
        this.jobs.get(name).cancel();
      }

      // Yeni görevi zamanla
      const job = schedule.scheduleJob(cronExpression, async () => {
        debug(`Running scheduled job: ${name}`);
        try {
          await task();
          debug(`Completed scheduled job: ${name}`);
        } catch (error) {
          logger.error(`Scheduled job ${name} failed:`, error);
        }
      });

      // Görevi kaydet
      this.jobs.set(name, job);
      debug(`Scheduled job: ${name} with cron: ${cronExpression}`);
    } catch (error) {
      logger.error(`Failed to schedule job ${name}:`, error);
      throw error;
    }
  }

  // Tek seferlik görev zamanlama
  scheduleOnce(name, date, task) {
    try {
      // Varolan görevi iptal et
      if (this.jobs.has(name)) {
        this.jobs.get(name).cancel();
      }

      // Yeni görevi zamanla
      const job = schedule.scheduleJob(date, async () => {
        debug(`Running one-time job: ${name}`);
        try {
          await task();
          debug(`Completed one-time job: ${name}`);
          this.jobs.delete(name);
        } catch (error) {
          logger.error(`One-time job ${name} failed:`, error);
        }
      });

      // Görevi kaydet
      this.jobs.set(name, job);
      debug(`Scheduled one-time job: ${name} for: ${date}`);
    } catch (error) {
      logger.error(`Failed to schedule one-time job ${name}:`, error);
      throw error;
    }
  }

  // Görevi iptal et
  cancelJob(name) {
    try {
      if (this.jobs.has(name)) {
        this.jobs.get(name).cancel();
        this.jobs.delete(name);
        debug(`Cancelled job: ${name}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to cancel job ${name}:`, error);
      throw error;
    }
  }

  // Tüm görevleri iptal et
  cancelAllJobs() {
    try {
      for (const [name, job] of this.jobs) {
        job.cancel();
        this.jobs.delete(name);
      }
      debug('Cancelled all jobs');
    } catch (error) {
      logger.error('Failed to cancel all jobs:', error);
      throw error;
    }
  }

  // Zamanlanmış görevleri listele
  listJobs() {
    try {
      const jobs = [];
      for (const [name, job] of this.jobs) {
        jobs.push({
          name,
          next: job.nextInvocation(),
          expression: job.expression
        });
      }
      return jobs;
    } catch (error) {
      logger.error('Failed to list jobs:', error);
      throw error;
    }
  }

  // Servisi kapat
  shutdown() {
    try {
      this.cancelAllJobs();
      debug('Scheduler service shut down');
    } catch (error) {
      logger.error('Failed to shut down scheduler service:', error);
      throw error;
    }
  }
}

// Singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;
