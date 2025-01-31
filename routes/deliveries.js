const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Delivery = require("../models/Delivery");
const Request = require("../models/Request");
const Material = require("../models/Material");
const Project = require("../models/Project");
const File = require("../models/File");
const { auth } = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");
const SearchBuilder = require("../middleware/searchBuilder");
const { deliveryValidators, validate } = require("../middleware/validators");
const { logStockMovement } = require("../config/logger");
const StockMovement = require("../models/StockMovement");
const { cache } = require("../middleware/cache");

// Teslimatları listele ve ara
router.get(
  "/",
  auth,
  cache("deliveries:list"),
  activityLogger("list_deliveries"),
  async (req, res, next) => {
    try {
      const search = new SearchBuilder(req.query)
        // Temel filtreleme
        .addFilter("status", req.query.status)
        // Tarih aralığı
        .addDateRange("delivery_date", req.query.start_date, req.query.end_date)
        // İlişkili tablolar
        .addInclude(
          Request,
          {
            project_id: req.query.project_id,
            material_id: req.query.material_id,
          },
          true
        )
        .addInclude(Material, {}, true)
        .addInclude(Project, {}, true)
        .addInclude(
          File,
          {
            category: "delivery_document",
            is_active: true,
          },
          false
        )
        // Sıralama
        .addOrder(
          req.query.sort_by || "delivery_date",
          req.query.sort_direction || "DESC"
        )
        // Sayfalama
        .setPagination(req.query.page, req.query.limit);

      const { count, rows } = await Delivery.findAndCountAll(search.build());

      // İlişkili verileri ve istatistikleri ekle
      const deliveries = rows.map((delivery) => ({
        ...delivery.toJSON(),
        request: {
          id: delivery.Request.id,
          requested_qty: delivery.Request.requestedQty,
          revised_qty: delivery.Request.revisedQty,
          status: delivery.Request.status,
        },
        material: {
          id: delivery.Request.Material.id,
          material_code: delivery.Request.Material.materialCode,
          description: delivery.Request.Material.description,
          unit: delivery.Request.Material.unit,
        },
        project: {
          id: delivery.Request.Project.id,
          project_name: delivery.Request.Project.projectName,
          pyp_number: delivery.Request.Project.pypNumber,
        },
        documents: delivery.Files?.length || 0,
      }));

      res.json({
        data: deliveries,
        pagination: {
          total: count,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
          total_pages: Math.ceil(count / (parseInt(req.query.limit) || 10)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Teslimat durumu güncelle
router.patch(
  "/:id/status",
  auth,
  validate,
  activityLogger("update_delivery_status"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const delivery = await Delivery.findByPk(req.params.id, {
        include: [
          {
            model: Request,
            include: [{ model: User, attributes: ["id", "username", "email"] }],
          },
        ],
      });

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: "Teslimat bulunamadı",
        });
      }

      await delivery.update({ status });

      // Güncellenmiş teslimatı önbelleğe kaydet
      // await deliveryCache.set(delivery.id, delivery);

      // Liste önbelleğini temizle
      // await deliveryCache.flush();

      // WebSocket bildirimi gönder
      // socketService.notifyDeliveryStatusChange(delivery.id, status, req.user.id);

      // İlgili talep sahibine bildirim gönder
      if (delivery.Request && delivery.Request.user_id) {
        // socketService.sendNotification(delivery.Request.user_id, {
        //   type: 'delivery_status_change',
        //   title: 'Teslimat Durumu Güncellendi',
        //   message: `Teslimatınızın durumu ${status} olarak güncellendi.`,
        //   deliveryId: delivery.id
        // });
      }

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Teslimatı tamamla
router.post(
  "/:request_id/complete",
  auth("admin", "taseron"),
  deliveryValidators.complete,
  validate,
  activityLogger("complete_delivery"),
  async (req, res, next) => {
    try {
      const { request_id } = req.params;

      // Talebi ve ilgili malzemeyi bul
      const request = await Request.findByPk(request_id, {
        include: [
          {
            model: Material,
            attributes: [
              "id",
              "materialCode",
              "description",
              "unit",
              "stockQty",
            ],
          },
          {
            model: Project,
            attributes: ["projectName", "pypNumber"],
          },
        ],
      });

      if (!request) {
        const error = new Error("Talep bulunamadı");
        error.status = 404;
        throw error;
      }

      // Talep durumunu kontrol et
      if (request.status !== "approved") {
        const error = new Error("Talep henüz onaylanmamış");
        error.status = 400;
        throw error;
      }

      // Önceki teslimat kontrolü
      const existingDelivery = await Delivery.findOne({
        where: { requestId: request.id },
      });

      if (existingDelivery) {
        const error = new Error("Bu talep için zaten teslimat yapılmış");
        error.status = 400;
        throw error;
      }

      // Stok miktarını kontrol et
      const deliveryQty = request.revisedQty || request.requestedQty;
      if (request.Material.stockQty < deliveryQty) {
        const error = new Error("Yeterli stok bulunmuyor");
        error.status = 400;
        throw error;
      }

      // Stoktan düş
      await request.Material.update({
        stockQty: request.Material.stockQty - deliveryQty,
      });

      // Stok hareketi oluştur
      await StockMovement.create({
        material_id: request.Material.id,
        user_id: req.user.id,
        type: "out",
        quantity: deliveryQty,
        previous_stock: request.Material.stockQty + deliveryQty,
        new_stock: request.Material.stockQty - deliveryQty,
        reference_type: "delivery",
        reference_id: request.id,
        notes: `Teslimat - Talep No: ${request.id}`,
      });

      // Log stok hareketi
      logStockMovement(request.Material.id, "out", deliveryQty, req.user.id, {
        type: "delivery",
        requestId: request.id,
      });

      // Teslimat kaydı oluştur
      const delivery = await Delivery.create({
        requestId: request.id,
        status: "completed",
        deliveryDate: new Date(),
      });

      // Talebin durumunu güncelle
      await request.update({ status: "delivered" });

      // Güncel teslimat bilgilerini getir
      const deliveryWithDetails = await Delivery.findByPk(delivery.id, {
        include: [
          {
            model: Request,
            include: [
              {
                model: Material,
                attributes: ["materialCode", "description", "unit", "stockQty"],
              },
              {
                model: Project,
                attributes: ["projectName", "pypNumber"],
              },
            ],
          },
        ],
      });

      res.json({
        message: "Teslimat başarıyla tamamlandı",
        delivery: {
          id: deliveryWithDetails.id,
          request_id: deliveryWithDetails.requestId,
          status: deliveryWithDetails.status,
          delivery_date: deliveryWithDetails.deliveryDate,
          created_at: deliveryWithDetails.createdAt,
          updated_at: deliveryWithDetails.updatedAt,
          request: {
            id: deliveryWithDetails.Request.id,
            requested_qty: deliveryWithDetails.Request.requestedQty,
            revised_qty: deliveryWithDetails.Request.revisedQty,
            status: deliveryWithDetails.Request.status,
            project: {
              project_name: deliveryWithDetails.Request.Project.projectName,
              pyp_number: deliveryWithDetails.Request.Project.pypNumber,
            },
            material: {
              material_code: deliveryWithDetails.Request.Material.materialCode,
              description: deliveryWithDetails.Request.Material.description,
              unit: deliveryWithDetails.Request.Material.unit,
              stock_qty: deliveryWithDetails.Request.Material.stockQty,
            },
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Teslimatları ara
router.get("/search", auth, cache(300), async (req, res) => {
  try {
    const { search, filters, sort, page = 1, limit = 10 } = req.query;

    const results = await searchService.search("delivery", {
      search,
      filters: filters ? JSON.parse(filters) : undefined,
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Arama geçmişini kaydet
    if (search) {
      await searchService.saveSearchHistory(req.user.id, "delivery", search);
    }

    res.json(results);
  } catch (error) {
    debug("Search failed:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Arama önerileri al
router.get("/suggestions", auth, cache(300), async (req, res) => {
  try {
    const { field, prefix } = req.query;

    const suggestions = await searchService.getSuggestions(
      "delivery",
      field,
      prefix,
      10
    );

    res.json(suggestions);
  } catch (error) {
    debug("Failed to get suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

// Popüler aramaları al
router.get("/popular-searches", auth, cache(3600), async (req, res) => {
  try {
    const { timeframe = "24h", limit = 10 } = req.query;

    const popularSearches = await searchService.getPopularSearches(
      "delivery",
      timeframe,
      parseInt(limit)
    );

    res.json(popularSearches);
  } catch (error) {
    debug("Failed to get popular searches:", error);
    res.status(500).json({ error: "Failed to get popular searches" });
  }
});

module.exports = router;
