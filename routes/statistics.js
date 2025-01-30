const express = require('express');
const router = express.Router();
const moment = require('moment');
const statisticsService = require('../services/statisticsService');
const { authenticate, authorize } = require('../middleware/auth');
const activityLogger = require('../middleware/activityLogger');

// Genel istatistikler
router.get('/overall',
  authenticate,
  authorize('admin', 'muhendis'),
  activityLogger('view_overall_stats'),
  async (req, res, next) => {
    try {
      const stats = await statisticsService.getOverallStats();
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
});

// Stok hareketleri istatistikleri
router.get('/stock-movements',
  authenticate,
  authorize('admin', 'depocu'),
  activityLogger('view_stock_movement_stats'),
  async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date ? moment(start_date).startOf('day') : moment().subtract(30, 'days').startOf('day');
      const endDate = end_date ? moment(end_date).endOf('day') : moment().endOf('day');

      const movements = await statisticsService.getStockMovementStats(startDate, endDate);
      res.json({ data: movements });
    } catch (error) {
      next(error);
    }
});

// Proje bazlı malzeme kullanımı
router.get('/project-material-usage/:project_id',
  authenticate,
  authorize('admin', 'muhendis'),
  activityLogger('view_project_material_usage'),
  async (req, res, next) => {
    try {
      const usage = await statisticsService.getProjectMaterialUsage(req.params.project_id);
      res.json({ data: usage });
    } catch (error) {
      next(error);
    }
});

// Talep durumu dağılımı
router.get('/request-status-distribution',
  authenticate,
  authorize('admin', 'muhendis', 'depocu'),
  activityLogger('view_request_status_distribution'),
  async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date ? moment(start_date).startOf('day') : moment().subtract(30, 'days').startOf('day');
      const endDate = end_date ? moment(end_date).endOf('day') : moment().endOf('day');

      const distribution = await statisticsService.getRequestStatusDistribution(startDate, endDate);
      res.json({ data: distribution });
    } catch (error) {
      next(error);
    }
});

// En çok kullanılan malzemeler
router.get('/most-used-materials',
  authenticate,
  authorize('admin', 'depocu'),
  activityLogger('view_most_used_materials'),
  async (req, res, next) => {
    try {
      const { limit } = req.query;
      const materials = await statisticsService.getMostUsedMaterials(parseInt(limit) || 10);
      res.json({ data: materials });
    } catch (error) {
      next(error);
    }
});

// Proje bazlı talep dağılımı
router.get('/project-request-distribution',
  authenticate,
  authorize('admin', 'muhendis'),
  activityLogger('view_project_request_distribution'),
  async (req, res, next) => {
    try {
      const distribution = await statisticsService.getProjectRequestDistribution();
      res.json({ data: distribution });
    } catch (error) {
      next(error);
    }
});

// Teslimat performansı
router.get('/delivery-performance',
  authenticate,
  authorize('admin', 'depocu'),
  activityLogger('view_delivery_performance'),
  async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date ? moment(start_date).startOf('day') : moment().subtract(30, 'days').startOf('day');
      const endDate = end_date ? moment(end_date).endOf('day') : moment().endOf('day');

      const performance = await statisticsService.getDeliveryPerformance(startDate, endDate);
      res.json({ data: performance });
    } catch (error) {
      next(error);
    }
});

// Stok seviyesi analizi
router.get('/stock-level-analysis',
  authenticate,
  authorize('admin', 'depocu'),
  activityLogger('view_stock_level_analysis'),
  async (req, res, next) => {
    try {
      const analysis = await statisticsService.getStockLevelAnalysis();
      res.json({ data: analysis });
    } catch (error) {
      next(error);
    }
});

module.exports = router;
