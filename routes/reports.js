const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const reportService = require('../services/reportService');
const statisticsService = require('../services/statisticsService');
const debug = require('debug')('app:reports');
const { logger } = require('../services/loggerService');

// Rapor oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.body;

    // Rapor verilerini hazırla
    let data = {};
    switch (type) {
      case 'stock':
        data.materials = await Material.findAll({ include: ['category'] });
        break;
      case 'request':
        data.requests = await Request.findAll({
          where: startDate && endDate ? {
            created_at: { [Op.between]: [startDate, endDate] }
          } : {},
          include: ['requestedBy', 'materials']
        });
        break;
      case 'delivery':
        data.deliveries = await Delivery.findAll({
          where: startDate && endDate ? {
            created_at: { [Op.between]: [startDate, endDate] }
          } : {},
          include: ['deliveredBy', 'receivedBy', 'request']
        });
        break;
      case 'user':
        data.users = await User.findAll({
          include: ['requests', 'deliveries']
        });
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Raporu oluştur
    const report = await reportService.generateReport(type, data, format, { startDate, endDate });
    res.json(report);
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// İstatistikleri getir
router.get('/stats/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let stats;
    switch (type) {
      case 'stock':
        stats = await statisticsService.getStockStats();
        break;
      case 'request':
        stats = await statisticsService.getRequestStats(startDate, endDate);
        break;
      case 'delivery':
        stats = await statisticsService.getDeliveryStats(startDate, endDate);
        break;
      case 'user':
        stats = await statisticsService.getUserStats();
        break;
      default:
        throw new Error('Invalid statistics type');
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rapor indir
router.get('/download/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../reports', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.download(filePath);
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
