const Queue = require('bull');
const { StaticPool } = require('node-worker-threads-pool');
const path = require('path');
const debug = require('debug')('app:worker');
const { logger } = require('./loggerService');
const cacheService = require('./cacheService');

class WorkerService {
  constructor() {
    // İş kuyrukları
    this.queues = {
      // E-posta gönderme kuyruğu
      email: new Queue('email', {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      }),

      // Rapor oluşturma kuyruğu
      report: new Queue('report', {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          attempts: 2,
          timeout: 300000 // 5 dakika
        }
      }),

      // Dosya işleme kuyruğu
      file: new Queue('file', {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          attempts: 2,
          timeout: 180000 // 3 dakika
        }
      }),

      // Veri senkronizasyon kuyruğu
      sync: new Queue('sync', {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      }),

      // Temizlik kuyruğu
      cleanup: new Queue('cleanup', {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          attempts: 3
        }
      })
    };

    // Worker thread havuzları
    this.pools = {
      // CPU yoğun işlemler için havuz
      compute: new StaticPool({
        size: 4,
        task: path.join(__dirname, '../workers/computeWorker.js')
      }),

      // Dosya işleme için havuz
      file: new StaticPool({
        size: 2,
        task: path.join(__dirname, '../workers/fileWorker.js')
      })
    };

    this.initialize();
  }

  // Worker'ları başlat
  async initialize() {
    try {
      // E-posta kuyruğu işleyicisi
      this.queues.email.process(async (job) => {
        const { type, data } = job.data;
        debug(`Processing email job ${job.id} of type ${type}`);

        try {
          switch (type) {
            case 'welcome':
              await this.sendWelcomeEmail(data);
              break;
            case 'reset':
              await this.sendPasswordResetEmail(data);
              break;
            case 'notification':
              await this.sendNotificationEmail(data);
              break;
            default:
              throw new Error(`Unknown email type: ${type}`);
          }
        } catch (error) {
          logger.error(`Email job ${job.id} failed:`, error);
          throw error;
        }
      });

      // Rapor kuyruğu işleyicisi
      this.queues.report.process(async (job) => {
        const { type, data } = job.data;
        debug(`Processing report job ${job.id} of type ${type}`);

        try {
          switch (type) {
            case 'stock':
              return await this.generateStockReport(data);
            case 'activity':
              return await this.generateActivityReport(data);
            case 'performance':
              return await this.generatePerformanceReport(data);
            default:
              throw new Error(`Unknown report type: ${type}`);
          }
        } catch (error) {
          logger.error(`Report job ${job.id} failed:`, error);
          throw error;
        }
      });

      // Dosya işleme kuyruğu işleyicisi
      this.queues.file.process(async (job) => {
        const { type, data } = job.data;
        debug(`Processing file job ${job.id} of type ${type}`);

        try {
          switch (type) {
            case 'upload':
              return await this.processFileUpload(data);
            case 'convert':
              return await this.convertFile(data);
            case 'compress':
              return await this.compressFile(data);
            default:
              throw new Error(`Unknown file type: ${type}`);
          }
        } catch (error) {
          logger.error(`File job ${job.id} failed:`, error);
          throw error;
        }
      });

      // Senkronizasyon kuyruğu işleyicisi
      this.queues.sync.process(async (job) => {
        const { type, data } = job.data;
        debug(`Processing sync job ${job.id} of type ${type}`);

        try {
          switch (type) {
            case 'database':
              return await this.syncDatabase(data);
            case 'files':
              return await this.syncFiles(data);
            case 'cache':
              return await this.syncCache(data);
            default:
              throw new Error(`Unknown sync type: ${type}`);
          }
        } catch (error) {
          logger.error(`Sync job ${job.id} failed:`, error);
          throw error;
        }
      });

      // Temizlik kuyruğu işleyicisi
      this.queues.cleanup.process(async (job) => {
        const { type, data } = job.data;
        debug(`Processing cleanup job ${job.id} of type ${type}`);

        try {
          switch (type) {
            case 'logs':
              return await this.cleanupLogs(data);
            case 'temp':
              return await this.cleanupTemp(data);
            case 'cache':
              return await this.cleanupCache(data);
            default:
              throw new Error(`Unknown cleanup type: ${type}`);
          }
        } catch (error) {
          logger.error(`Cleanup job ${job.id} failed:`, error);
          throw error;
        }
      });

      // Olay dinleyicileri
      Object.values(this.queues).forEach(queue => {
        queue.on('completed', (job) => {
          debug(`Job ${job.id} completed`);
        });

        queue.on('failed', (job, error) => {
          logger.error(`Job ${job.id} failed:`, error);
        });

        queue.on('error', (error) => {
          logger.error('Queue error:', error);
        });
      });

      debug('Worker service initialized');
    } catch (error) {
      logger.error('Worker service initialization failed:', error);
      throw error;
    }
  }

  // İş ekle
  async addJob(queueName, type, data, options = {}) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add({ type, data }, options);
      debug(`Added ${type} job ${job.id} to ${queueName} queue`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job to ${queueName} queue:`, error);
      throw error;
    }
  }

  // İş durumunu kontrol et
  async getJobStatus(queueName, jobId) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      const progress = await job.progress();

      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade
      };
    } catch (error) {
      logger.error(`Failed to get job status:`, error);
      throw error;
    }
  }

  // Kuyruk istatistiklerini al
  async getQueueStats(queueName) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    } catch (error) {
      logger.error(`Failed to get queue stats:`, error);
      throw error;
    }
  }

  // Tüm kuyrukları temizle
  async cleanAllQueues() {
    try {
      await Promise.all(
        Object.values(this.queues).map(queue => queue.clean(0, 'completed'))
      );
      debug('All queues cleaned');
    } catch (error) {
      logger.error('Failed to clean queues:', error);
      throw error;
    }
  }

  // Worker havuzunda görev çalıştır
  async executeInPool(poolName, data) {
    try {
      const pool = this.pools[poolName];
      if (!pool) {
        throw new Error(`Pool ${poolName} not found`);
      }

      return await pool.exec(data);
    } catch (error) {
      logger.error(`Failed to execute in pool ${poolName}:`, error);
      throw error;
    }
  }

  // Servisi kapat
  async shutdown() {
    try {
      // Kuyrukları kapat
      await Promise.all(
        Object.values(this.queues).map(queue => queue.close())
      );

      // Havuzları kapat
      await Promise.all(
        Object.values(this.pools).map(pool => pool.destroy())
      );

      debug('Worker service shut down');
    } catch (error) {
      logger.error('Failed to shut down worker service:', error);
      throw error;
    }
  }
}

// Singleton instance
const workerService = new WorkerService();

module.exports = workerService;
