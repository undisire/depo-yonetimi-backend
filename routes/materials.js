const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Material = require("../models/Material");
const StockMovement = require("../models/StockMovement");
const Request = require("../models/Request");
const File = require("../models/File");
const { auth } = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");
const SearchBuilder = require("../middleware/searchBuilder");
const { materialValidators, validate } = require("../middleware/validators");
const logStockMovement = require("../config/logger");
const { cache, clearCache } = require("../middleware/cache");
const socketService = require("../services/socketService"); // Added socketService
const searchService = require("../services/searchService");

/**
 * @swagger
 * /api/materials:
 *   get:
 *     summary: Tüm malzemeleri listeler
 *     description: Sistemdeki tüm malzemeleri sayfalama ve filtreleme seçenekleriyle listeler
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Malzeme kodu veya açıklamasında arama yapar
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sıralama alanı ve yönü (örn. stock_qty:desc)
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Material'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/",
  auth,
  cache("materials:list", 300), // 5 dakika cache
  activityLogger("list_materials"),
  async (req, res, next) => {
    try {
      const search = new SearchBuilder(req.query)
        // Temel arama
        .addSearch(["material_code", "description"], req.query.search)
        // Filtreleme
        .addFilter("unit", req.query.unit)
        .addNumberRange("stock_qty", req.query.min_stock, req.query.max_stock)
        // İlişkili tablolar
        .addInclude(StockMovement, {}, false)
        .addInclude(
          Request,
          {
            status: req.query.request_status,
          },
          false
        )
        .addInclude(
          File,
          {
            category: "material_document",
            is_active: true,
          },
          false
        )
        // Sıralama
        .addOrder(
          req.query.sort_by || "material_code",
          req.query.sort_direction || "ASC"
        )
        // Sayfalama
        .setPagination(req.query.page, req.query.limit);

      const { count, rows } = await Material.findAndCountAll(search.build());

      // Stok hareketi ve talep istatistiklerini hesapla
      const materials = rows.map((material) => ({
        ...material.toJSON(),
        stats: {
          total_requests: material.Requests?.length || 0,
          pending_requests:
            material.Requests?.filter((r) => r.status === "pending").length ||
            0,
          stock_movements: material.StockMovements?.length || 0,
          documents: material.Files?.length || 0,
        },
      }));

      res.json({
        data: materials,
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

/**
 * @swagger
 * /api/materials/{id}:
 *   get:
 *     summary: Malzeme detayını getirir
 *     description: Belirtilen ID'ye sahip malzemenin detay bilgilerini getirir
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Malzeme ID
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       404:
 *         description: Malzeme bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  auth,
  cache("materials:detail", 300),
  activityLogger("view_material"),
  async (req, res, next) => {
    try {
      const material = await Material.findByPk(req.params.id, {
        include: [
          {
            model: Request,
            attributes: [
              "id",
              "requestedQty",
              "revisedQty",
              "status",
              "createdAt",
            ],
          },
        ],
      });

      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      const formattedRequests = material.Requests.map((request) => ({
        id: request.id,
        requested_qty: request.requestedQty,
        revised_qty: request.revisedQty,
        status: request.status,
        created_at: request.createdAt,
      }));

      res.json({
        id: material.id,
        material_code: material.materialCode,
        description: material.description,
        unit: material.unit,
        stock_qty: material.stockQty,
        created_at: material.createdAt,
        updated_at: material.updatedAt,
        requests: formattedRequests,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/materials:
 *   post:
 *     summary: Yeni malzeme ekler
 *     description: Sisteme yeni bir malzeme ekler
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - material_code
 *               - description
 *             properties:
 *               material_code:
 *                 type: string
 *               description:
 *                 type: string
 *               unit:
 *                 type: string
 *               stock_qty:
 *                 type: number
 *                 default: 0
 *     responses:
 *       201:
 *         description: Malzeme başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  auth("admin", "depocu"),
  materialValidators.create,
  validate,
  activityLogger("create_material"),
  clearCache("materials"),
  async (req, res, next) => {
    try {
      const { material_code, description } = req.body;

      const material = await Material.create({
        materialCode: material_code,
        description,
      });

      res.status(201).json({
        message: "Malzeme başarıyla eklendi",
        material: {
          id: material.id,
          material_code: material.materialCode,
          description: material.description,
          unit: material.unit,
          stock_qty: material.stockQty,
          created_at: material.createdAt,
          updated_at: material.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/materials/{id}/attributes:
 *   put:
 *     summary: Malzeme özniteliğini günceller
 *     description: Belirtilen ID'ye sahip malzemenin özniteliğini günceller
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Malzeme ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unit:
 *                 type: string
 *     responses:
 *       200:
 *         description: Malzeme özniteliği başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       404:
 *         description: Malzeme bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id/attributes",
  auth,
  materialValidators.updateAttributes,
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { unit } = req.body;

      const material = await Material.findByPk(id);
      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      await material.update({ unit });

      res.json({
        message: "Malzeme özniteliği başarıyla güncellendi",
        material: {
          id: material.id,
          material_code: material.materialCode,
          description: material.description,
          unit: material.unit,
          stock_qty: material.stockQty,
          created_at: material.createdAt,
          updated_at: material.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/materials/{id}:
 *   put:
 *     summary: Malzeme günceller
 *     description: Belirtilen ID'ye sahip malzemeyi günceller
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Malzeme ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               material_code:
 *                 type: string
 *               description:
 *                 type: string
 *               unit:
 *                 type: string
 *               stock_qty:
 *                 type: number
 *     responses:
 *       200:
 *         description: Malzeme başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       404:
 *         description: Malzeme bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id",
  auth("admin", "depocu"),
  materialValidators.update,
  validate,
  activityLogger("update_material"),
  clearCache("materials"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { material_code, description } = req.body;

      const material = await Material.findByPk(id);
      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      // Aktif talepleri kontrol et
      const activeRequests = await Request.count({
        where: {
          materialId: id,
          status: ["pending", "approved"],
        },
      });

      if (activeRequests > 0) {
        const error = new Error("Aktif talebi olan malzeme güncellenemez");
        error.status = 400;
        throw error;
      }

      await material.update({
        materialCode: material_code,
        description,
      });

      res.json({
        message: "Malzeme başarıyla güncellendi",
        material: {
          id: material.id,
          material_code: material.materialCode,
          description: material.description,
          unit: material.unit,
          stock_qty: material.stockQty,
          created_at: material.createdAt,
          updated_at: material.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/materials/{id}:
 *   delete:
 *     summary: Malzeme siler
 *     description: Belirtilen ID'ye sahip malzemeyi siler
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Malzeme ID
 *     responses:
 *       204:
 *         description: Malzeme başarıyla silindi
 *       404:
 *         description: Malzeme bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/:id",
  auth("admin", "depocu"),
  activityLogger("delete_material"),
  clearCache("materials"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const material = await Material.findByPk(id);
      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      // Aktif veya tamamlanmış talepleri kontrol et
      const relatedRequests = await Request.count({
        where: {
          materialId: id,
        },
      });

      if (relatedRequests > 0) {
        const error = new Error(
          "Bu malzemeye ait talepler olduğu için silinemez"
        );
        error.status = 400;
        throw error;
      }

      await material.destroy();

      res.json({
        message: "Malzeme başarıyla silindi",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Stok güncelle
router.patch(
  "/:id/stock",
  auth,
  // materialValidators.stock,
  validate,
  activityLogger("stock_update"),
  async (req, res, next) => {
    try {
      const { stock_qty } = req.body;
      const material = await Material.findByPk(req.params.id);

      if (!material) {
        return res.status(404).json({
          success: false,
          error: "Malzeme bulunamadı",
        });
      }

      // Eski stok miktarını sakla
      const oldStock = material.stock_qty;

      await material.update({ stock_qty });

      // Güncellenmiş malzemeyi önbelleğe kaydet
      await materialCache.set(material.id, material);

      // Liste önbelleğini temizle
      await materialCache.flush();

      // WebSocket bildirimi gönder
      socketService.notifyStockUpdate(material.id, stock_qty, req.user.id);

      // Stok düşük seviyede ise bildirim gönder
      if (stock_qty <= material.min_stock_qty) {
        socketService.notifyLowStock(
          material.id,
          stock_qty,
          material.min_stock_qty
        );
      }

      res.json({
        success: true,
        data: material,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Malzemeleri ara
router.get("/search", auth, cache(300), async (req, res) => {
  try {
    const { search, filters, sort, page = 1, limit = 10 } = req.query;

    const results = await searchService.search("material", {
      search,
      filters: filters ? JSON.parse(filters) : undefined,
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Arama geçmişini kaydet
    if (search) {
      await searchService.saveSearchHistory(req.user.id, "material", search);
    }

    res.json(results);
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Arama önerileri al
router.get("/suggestions", auth, cache(300), async (req, res) => {
  try {
    const { field, prefix } = req.query;

    const suggestions = await searchService.getSuggestions(
      "material",
      field,
      prefix,
      10
    );

    res.json(suggestions);
  } catch (error) {
    console.error("Failed to get suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

// Popüler aramaları al
router.get("/popular-searches", auth, cache(3600), async (req, res) => {
  try {
    const { timeframe = "24h", limit = 10 } = req.query;

    const popularSearches = await searchService.getPopularSearches(
      "material",
      timeframe,
      parseInt(limit)
    );

    res.json(popularSearches);
  } catch (error) {
    console.error("Failed to get popular searches:", error);
    res.status(500).json({ error: "Failed to get popular searches" });
  }
});

module.exports = router;
