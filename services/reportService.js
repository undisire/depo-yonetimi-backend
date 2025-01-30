const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const debug = require('debug')('app:report');
const { logger } = require('./loggerService');
const statisticsService = require('./statisticsService');
const cacheService = require('./cacheService');

class ReportService {
  constructor() {
    this.reportTypes = {
      stock: this.generateStockReport,
      request: this.generateRequestReport,
      delivery: this.generateDeliveryReport,
      user: this.generateUserReport,
      performance: this.generatePerformanceReport
    };

    this.formats = {
      pdf: this.generatePDF,
      excel: this.generateExcel
    };
  }

  // Rapor oluştur
  async generateReport(type, data, format = 'pdf', options = {}) {
    try {
      // Rapor tipini kontrol et
      const reportGenerator = this.reportTypes[type];
      if (!reportGenerator) {
        throw new Error(`Invalid report type: ${type}`);
      }

      // Format tipini kontrol et
      const formatGenerator = this.formats[format];
      if (!formatGenerator) {
        throw new Error(`Invalid format type: ${format}`);
      }

      // Rapor verilerini oluştur
      const reportData = await reportGenerator.call(this, data, options);

      // Raporu formatla
      const report = await formatGenerator.call(this, reportData, options);

      // Raporu kaydet
      const fileName = this.generateFileName(type, format);
      const filePath = path.join(__dirname, '../reports', fileName);
      await fs.writeFile(filePath, report);

      return {
        fileName,
        filePath,
        type,
        format,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Report generation failed:', error);
      throw error;
    }
  }

  // Stok raporu oluştur
  async generateStockReport(data, options = {}) {
    const stats = await statisticsService.getStockStats();
    
    return {
      title: 'Stok Raporu',
      date: new Date(),
      summary: {
        totalStock: stats.totalStock,
        lowStock: stats.lowStock,
        outOfStock: stats.outOfStock
      },
      categories: stats.byCategory,
      topMaterials: stats.topMaterials,
      details: data.materials.map(material => ({
        code: material.code,
        name: material.name,
        category: material.category?.name,
        stock: material.stock_qty,
        minStock: material.min_stock_qty,
        unit: material.unit,
        location: material.location
      }))
    };
  }

  // Talep raporu oluştur
  async generateRequestReport(data, options = {}) {
    const { startDate, endDate } = options;
    const stats = await statisticsService.getRequestStats(startDate, endDate);
    
    return {
      title: 'Talep Raporu',
      date: new Date(),
      period: { startDate, endDate },
      summary: {
        total: stats.total,
        byStatus: stats.byStatus,
        byPriority: stats.byPriority
      },
      userStats: stats.byUser,
      materialStats: stats.byMaterial,
      timeline: stats.timeline,
      details: data.requests.map(request => ({
        id: request.id,
        status: request.status,
        priority: request.priority,
        requestedBy: request.requestedBy?.username,
        materials: request.materials.map(m => ({
          name: m.name,
          quantity: m.RequestMaterial.quantity
        })),
        createdAt: request.created_at
      }))
    };
  }

  // Teslimat raporu oluştur
  async generateDeliveryReport(data, options = {}) {
    const { startDate, endDate } = options;
    const stats = await statisticsService.getDeliveryStats(startDate, endDate);
    
    return {
      title: 'Teslimat Raporu',
      date: new Date(),
      period: { startDate, endDate },
      summary: {
        total: stats.total,
        byStatus: stats.byStatus,
        performance: stats.performance
      },
      userStats: stats.byUser,
      timeline: stats.timeline,
      details: data.deliveries.map(delivery => ({
        id: delivery.id,
        status: delivery.status,
        request: delivery.request?.id,
        deliveredBy: delivery.deliveredBy?.username,
        receivedBy: delivery.receivedBy?.username,
        expectedDate: delivery.expected_date,
        deliveryDate: delivery.delivery_date,
        notes: delivery.notes
      }))
    };
  }

  // Kullanıcı raporu oluştur
  async generateUserReport(data, options = {}) {
    const stats = await statisticsService.getUserStats();
    
    return {
      title: 'Kullanıcı Raporu',
      date: new Date(),
      summary: {
        total: stats.total,
        byRole: stats.byRole,
        byDepartment: stats.byDepartment
      },
      activity: stats.activity,
      performance: stats.performance,
      details: data.users.map(user => ({
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }))
    };
  }

  // Performans raporu oluştur
  async generatePerformanceReport(data, options = {}) {
    const { startDate, endDate } = options;
    const [requestStats, deliveryStats, userStats] = await Promise.all([
      statisticsService.getRequestStats(startDate, endDate),
      statisticsService.getDeliveryStats(startDate, endDate),
      statisticsService.getUserStats()
    ]);
    
    return {
      title: 'Performans Raporu',
      date: new Date(),
      period: { startDate, endDate },
      summary: {
        requests: {
          total: requestStats.total,
          byStatus: requestStats.byStatus,
          timeline: requestStats.timeline
        },
        deliveries: {
          total: deliveryStats.total,
          performance: deliveryStats.performance,
          timeline: deliveryStats.timeline
        },
        users: {
          performance: userStats.performance,
          activity: userStats.activity
        }
      }
    };
  }

  // PDF raporu oluştur
  async generatePDF(data, options = {}) {
    const doc = new PDFDocument();
    const chunks = [];

    return new Promise((resolve, reject) => {
      // Veriyi topla
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Başlık
      doc.fontSize(20).text(data.title, { align: 'center' });
      doc.moveDown();

      // Tarih
      doc.fontSize(12).text(`Tarih: ${data.date.toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      // Özet
      if (data.summary) {
        doc.fontSize(16).text('Özet');
        doc.moveDown();
        Object.entries(data.summary).forEach(([key, value]) => {
          if (typeof value === 'object') {
            doc.fontSize(12).text(`${key}:`);
            Object.entries(value).forEach(([k, v]) => {
              doc.fontSize(10).text(`  ${k}: ${v}`);
            });
          } else {
            doc.fontSize(12).text(`${key}: ${value}`);
          }
        });
        doc.moveDown();
      }

      // Detaylar
      if (data.details) {
        doc.fontSize(16).text('Detaylar');
        doc.moveDown();
        data.details.forEach(detail => {
          Object.entries(detail).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              doc.fontSize(10).text(`${key}: ${value}`);
            }
          });
          doc.moveDown(0.5);
        });
      }

      doc.end();
    });
  }

  // Excel raporu oluştur
  async generateExcel(data, options = {}) {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Rapor');

    // Başlık
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = data.title;
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').font = { size: 14, bold: true };

    // Tarih
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Tarih: ${data.date.toLocaleDateString()}`;
    worksheet.getCell('A2').alignment = { horizontal: 'right' };

    // Özet
    let row = 4;
    if (data.summary) {
      worksheet.getCell(`A${row}`).value = 'Özet';
      worksheet.getCell(`A${row}`).font = { bold: true };
      row++;

      Object.entries(data.summary).forEach(([key, value]) => {
        if (typeof value === 'object') {
          worksheet.getCell(`A${row}`).value = key;
          row++;
          Object.entries(value).forEach(([k, v]) => {
            worksheet.getCell(`B${row}`).value = k;
            worksheet.getCell(`C${row}`).value = v;
            row++;
          });
        } else {
          worksheet.getCell(`A${row}`).value = key;
          worksheet.getCell(`B${row}`).value = value;
          row++;
        }
      });
      row += 2;
    }

    // Detaylar
    if (data.details && data.details.length > 0) {
      worksheet.getCell(`A${row}`).value = 'Detaylar';
      worksheet.getCell(`A${row}`).font = { bold: true };
      row++;

      // Başlıklar
      const headers = Object.keys(data.details[0]);
      headers.forEach((header, index) => {
        worksheet.getCell(row, index + 1).value = header;
        worksheet.getCell(row, index + 1).font = { bold: true };
      });
      row++;

      // Veriler
      data.details.forEach(detail => {
        headers.forEach((header, index) => {
          worksheet.getCell(row, index + 1).value = detail[header];
        });
        row++;
      });
    }

    // Stil ayarları
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return workbook.xlsx.writeBuffer();
  }

  // Dosya adı oluştur
  generateFileName(type, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_report_${timestamp}.${format}`;
  }
}

// Singleton instance
const reportService = new ReportService();

module.exports = reportService;
