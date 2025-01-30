const nodemailer = require('nodemailer');
const Email = require('email-templates');
const path = require('path');
const debug = require('debug')('app:email');
const { logger } = require('./loggerService');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.email = new Email({
      message: {
        from: process.env.EMAIL_FROM
      },
      send: true,
      transport: this.transporter,
      views: {
        root: path.join(__dirname, '../templates/emails'),
        options: {
          extension: 'hbs'
        }
      },
      juice: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.join(__dirname, '../templates/emails/css')
        }
      }
    });

    this.initialize();
  }

  // Transporter'ı test et
  async initialize() {
    try {
      await this.transporter.verify();
      debug('SMTP connection established');
    } catch (error) {
      logger.error('SMTP connection error:', error);
      throw error;
    }
  }

  // Genel e-posta gönderme fonksiyonu
  async sendEmail(template, to, subject, locals) {
    try {
      const result = await this.email.send({
        template,
        message: {
          to,
          subject
        },
        locals
      });

      debug(`Email sent to ${to}`);
      return result;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // Hoş geldin e-postası
  async sendWelcomeEmail(user) {
    try {
      await this.sendEmail('welcome', user.email, 'Depo Yönetim Sistemine Hoş Geldiniz', {
        name: user.name,
        username: user.username,
        loginUrl: `${process.env.CLIENT_URL}/login`
      });
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      throw error;
    }
  }

  // Şifre sıfırlama e-postası
  async sendPasswordResetEmail(user, token) {
    try {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await this.sendEmail('password-reset', user.email, 'Şifre Sıfırlama Talebi', {
        name: user.name,
        resetUrl,
        expiresIn: '1 saat'
      });
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Yeni talep bildirimi
  async sendNewRequestNotification(request, admin) {
    try {
      await this.sendEmail('new-request', admin.email, 'Yeni Malzeme Talebi', {
        adminName: admin.name,
        requestId: request.id,
        material: request.Material.material_code,
        quantity: request.requested_qty,
        requestedBy: request.User.name,
        requestUrl: `${process.env.CLIENT_URL}/requests/${request.id}`
      });
    } catch (error) {
      logger.error('Error sending new request notification:', error);
      throw error;
    }
  }

  // Talep durumu güncelleme bildirimi
  async sendRequestStatusUpdate(request, user) {
    try {
      await this.sendEmail('request-status', user.email, 'Talep Durumu Güncellendi', {
        name: user.name,
        requestId: request.id,
        material: request.Material.material_code,
        status: request.status,
        requestUrl: `${process.env.CLIENT_URL}/requests/${request.id}`
      });
    } catch (error) {
      logger.error('Error sending request status update:', error);
      throw error;
    }
  }

  // Teslimat bildirimi
  async sendDeliveryNotification(delivery, user) {
    try {
      await this.sendEmail('delivery', user.email, 'Malzeme Teslimatı', {
        name: user.name,
        deliveryId: delivery.id,
        material: delivery.Request.Material.material_code,
        quantity: delivery.delivered_qty,
        deliveryUrl: `${process.env.CLIENT_URL}/deliveries/${delivery.id}`
      });
    } catch (error) {
      logger.error('Error sending delivery notification:', error);
      throw error;
    }
  }

  // Düşük stok uyarısı
  async sendLowStockAlert(material, admin) {
    try {
      await this.sendEmail('low-stock', admin.email, 'Düşük Stok Uyarısı', {
        adminName: admin.name,
        material: material.material_code,
        currentStock: material.stock_qty,
        minStock: material.min_stock_qty,
        materialUrl: `${process.env.CLIENT_URL}/materials/${material.id}`
      });
    } catch (error) {
      logger.error('Error sending low stock alert:', error);
      throw error;
    }
  }

  // Rapor gönderimi
  async sendReport(report, user) {
    try {
      await this.sendEmail('report', user.email, report.title, {
        name: user.name,
        reportTitle: report.title,
        reportDate: report.date,
        reportUrl: `${process.env.CLIENT_URL}/reports/${report.id}`
      }, [{
        filename: report.fileName,
        path: report.filePath
      }]);
    } catch (error) {
      logger.error('Error sending report:', error);
      throw error;
    }
  }

  // Haftalık özet
  async sendWeeklySummary(user, summary) {
    try {
      await this.sendEmail('weekly-summary', user.email, 'Haftalık Özet Raporu', {
        name: user.name,
        week: summary.week,
        year: summary.year,
        stats: summary.stats,
        summaryUrl: `${process.env.CLIENT_URL}/dashboard`
      });
    } catch (error) {
      logger.error('Error sending weekly summary:', error);
      throw error;
    }
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
