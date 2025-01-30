const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { logger } = require('../config/logger');

// Email transporter yapılandırması
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Bildirim oluştur
  async createNotification(userId, title, message, options = {}) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type: options.type || 'info',
        category: options.category || 'system',
        reference_type: options.referenceType,
        reference_id: options.referenceId
      });

      // Socket.io ile anlık bildirim gönder
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        created_at: notification.createdAt
      });

      // Email bildirimi gönder
      if (options.sendEmail) {
        const user = await User.findByPk(userId);
        if (user && user.email) {
          await this.sendEmail(user.email, title, message);
        }
      }

      return notification;
    } catch (error) {
      logger.error('Bildirim oluşturma hatası:', error);
      throw error;
    }
  }

  // Email gönder
  async sendEmail(to, subject, text) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Depo Sistemi" <depo@example.com>',
        to,
        subject,
        text
      });
    } catch (error) {
      logger.error('Email gönderme hatası:', error);
      throw error;
    }
  }

  // Talep durumu değişikliği bildirimi
  async notifyRequestStatusChange(request, oldStatus) {
    const users = await User.findAll({
      where: {
        role: request.status === 'approved' ? 'taseron' : 'muhendis'
      }
    });

    const statusMessages = {
      approved: 'onaylandı',
      rejected: 'reddedildi',
      revised: 'revize edildi',
      delivered: 'teslim edildi'
    };

    for (const user of users) {
      await this.createNotification(
        user.id,
        'Talep Durumu Değişikliği',
        `Talep #${request.id} ${statusMessages[request.status]}`,
        {
          type: request.status === 'rejected' ? 'error' : 'success',
          category: 'request_status',
          referenceType: 'request',
          referenceId: request.id,
          sendEmail: true
        }
      );
    }
  }

  // Düşük stok bildirimi
  async notifyLowStock(material, threshold) {
    const users = await User.findAll({
      where: {
        role: ['admin', 'depocu']
      }
    });

    for (const user of users) {
      await this.createNotification(
        user.id,
        'Düşük Stok Uyarısı',
        `${material.description} (${material.material_code}) stok seviyesi ${threshold} birim altına düştü. Mevcut stok: ${material.stock_qty} ${material.unit}`,
        {
          type: 'warning',
          category: 'stock_level',
          referenceType: 'material',
          referenceId: material.id,
          sendEmail: true
        }
      );
    }
  }

  // Teslimat bildirimi
  async notifyDeliveryComplete(delivery) {
    const users = await User.findAll({
      where: {
        role: ['admin', 'muhendis', 'depocu']
      }
    });

    for (const user of users) {
      await this.createNotification(
        user.id,
        'Teslimat Tamamlandı',
        `Talep #${delivery.request_id} için teslimat tamamlandı`,
        {
          type: 'success',
          category: 'delivery_status',
          referenceType: 'delivery',
          referenceId: delivery.id,
          sendEmail: true
        }
      );
    }
  }
}

module.exports = NotificationService;
