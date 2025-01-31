const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Request = require("../models/Request");
const Material = require("../models/Material");
const Project = require("../models/Project");
const Delivery = require("../models/Delivery");
const File = require("../models/File");
const { auth } = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");
const SearchBuilder = require("../middleware/searchBuilder");
const { requestValidators, validate } = require("../middleware/validators");
const { cache } = require("../middleware/cache");
const socketService = require("../services/socketService"); // Added socketService
const searchService = require("../services/searchService");

// Model cache middleware'i
const requestCache = cache("request", 3600);

// Talep oluştur
router.post(
  "/",
  auth("muhendis"),
  requestValidators.create,
  validate,
  activityLogger("create_request"),
  async (req, res, next) => {
    try {
      const { project_id, material_id, requested_qty } = req.body;

      // Proje ve malzeme kontrolü
      const [project, material] = await Promise.all([
        Project.findByPk(project_id),
        Material.findByPk(material_id),
      ]);

      if (!project) {
        const error = new Error("Proje bulunamadı");
        error.status = 404;
        throw error;
      }

      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      const request = await Request.create({
        projectId: project_id,
        materialId: material_id,
        requestedQty: requested_qty,
        status: "pending",
      });

      // İlişkili verileri getir
      const requestWithDetails = await Request.findByPk(request.id, {
        include: [
          {
            model: Project,
            attributes: ["projectName", "pypNumber"],
          },
          {
            model: Material,
            attributes: ["materialCode", "description", "unit"],
          },
        ],
      });

      // Talebi önbelleğe kaydet
      await requestCache.set(request.id, request);

      res.status(201).json({
        message: "Talep başarıyla oluşturuldu",
        request: {
          id: requestWithDetails.id,
          project_id: requestWithDetails.projectId,
          material_id: requestWithDetails.materialId,
          requested_qty: requestWithDetails.requestedQty,
          revised_qty: requestWithDetails.revisedQty,
          status: requestWithDetails.status,
          created_at: requestWithDetails.createdAt,
          updated_at: requestWithDetails.updatedAt,
          project: {
            project_name: requestWithDetails.Project.projectName,
            pyp_number: requestWithDetails.Project.pypNumber,
          },
          material: {
            material_code: requestWithDetails.Material.materialCode,
            description: requestWithDetails.Material.description,
            unit: requestWithDetails.Material.unit,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Talepleri listele ve ara
router.get(
  "/",
  auth,
  cache("requests:list"),
  activityLogger("list_requests"),
  async (req, res, next) => {
    try {
      const search = new SearchBuilder(req.query)
        // Temel filtreleme
        .addFilter("status", req.query.status)
        .addFilter("project_id", req.query.project_id)
        .addFilter("material_id", req.query.material_id)
        // Tarih aralığı
        .addDateRange("createdAt", req.query.start_date, req.query.end_date)
        // Miktar aralığı
        .addNumberRange("requested_qty", req.query.min_qty, req.query.max_qty)
        // İlişkili tablolar
        .addInclude(Material, {}, true)
        .addInclude(Project, {}, true)
        .addInclude(Delivery, {}, false)
        .addInclude(
          File,
          {
            category: "request_document",
            is_active: true,
          },
          false
        )
        // Sıralama
        .addOrder(
          req.query.sort_by || "createdAt",
          req.query.sort_direction || "DESC"
        )
        // Sayfalama
        .setPagination(req.query.page, req.query.limit);

      const { count, rows } = await Request.findAndCountAll(search.build());

      // İlişkili verileri ve istatistikleri ekle
      const requests = rows.map((request) => ({
        ...request.toJSON(),
        material: {
          id: request.Material.id,
          material_code: request.Material.material_code,
          description: request.Material.description,
          unit: request.Material.unit,
        },
        project: {
          id: request.Project.id,
          project_name: request.Project.project_name,
          pyp_number: request.Project.pyp_number,
        },
        delivery: request.Delivery
          ? {
              id: request.Delivery.id,
              status: request.Delivery.status,
              delivery_date: request.Delivery.delivery_date,
            }
          : null,
        documents: request.Files?.length || 0,
      }));

      res.json({
        data: requests,
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

// Talep detayı
router.get("/:id", auth, async (req, res, next) => {
  try {
    // Önbellekten kontrol et
    const cachedRequest = await requestCache.get(req.params.id);
    if (cachedRequest) {
      return res.json({
        id: cachedRequest.id,
        project_id: cachedRequest.projectId,
        material_id: cachedRequest.materialId,
        requested_qty: cachedRequest.requestedQty,
        revised_qty: cachedRequest.revisedQty,
        status: cachedRequest.status,
        created_at: cachedRequest.createdAt,
        updated_at: cachedRequest.updatedAt,
        project: {
          project_name: cachedRequest.Project.projectName,
          pyp_number: cachedRequest.Project.pypNumber,
        },
        material: {
          material_code: cachedRequest.Material.materialCode,
          description: cachedRequest.Material.description,
          unit: cachedRequest.Material.unit,
          stock_qty: cachedRequest.Material.stockQty,
        },
      });
    }

    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          attributes: ["projectName", "pypNumber"],
        },
        {
          model: Material,
          attributes: ["materialCode", "description", "unit", "stockQty"],
        },
      ],
    });

    if (!request) {
      const error = new Error("Talep bulunamadı");
      error.status = 404;
      throw error;
    }

    // Talebi önbelleğe kaydet
    await requestCache.set(request.id, request);

    res.json({
      id: request.id,
      project_id: request.projectId,
      material_id: request.materialId,
      requested_qty: request.requestedQty,
      revised_qty: request.revisedQty,
      status: request.status,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      project: {
        project_name: request.Project.projectName,
        pyp_number: request.Project.pypNumber,
      },
      material: {
        material_code: request.Material.materialCode,
        description: request.Material.description,
        unit: request.Material.unit,
        stock_qty: request.Material.stockQty,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Talep güncelle (Onay/Red/Revizyon)
router.put(
  "/:id",
  auth("admin", "depocu"),
  requestValidators.update,
  validate,
  activityLogger("update_request"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, revised_qty } = req.body;

      const request = await Request.findByPk(id, {
        include: [
          {
            model: Project,
            attributes: ["projectName", "pypNumber"],
          },
          {
            model: Material,
            attributes: ["materialCode", "description", "unit", "stockQty"],
          },
        ],
      });

      if (!request) {
        const error = new Error("Talep bulunamadı");
        error.status = 404;
        throw error;
      }

      // Sadece bekleyen talepler güncellenebilir
      if (request.status !== "pending") {
        const error = new Error("Sadece bekleyen talepler güncellenebilir");
        error.status = 400;
        throw error;
      }

      // Revize miktar kontrolü
      if (revised_qty && revised_qty > request.Material.stockQty) {
        const error = new Error("Revize miktar stok miktarından büyük olamaz");
        error.status = 400;
        throw error;
      }

      await request.update({
        status,
        revisedQty: revised_qty || request.requestedQty,
      });

      // Güncellenmiş talebi önbelleğe kaydet
      await requestCache.set(request.id, request);

      // Liste önbelleğini temizle
      await requestCache.flush();

      res.json({
        message: "Talep başarıyla güncellendi",
        request: {
          id: request.id,
          project_id: request.projectId,
          material_id: request.materialId,
          requested_qty: request.requestedQty,
          revised_qty: request.revisedQty,
          status: request.status,
          created_at: request.createdAt,
          updated_at: request.updatedAt,
          project: {
            project_name: request.Project.projectName,
            pyp_number: request.Project.pypNumber,
          },
          material: {
            material_code: request.Material.materialCode,
            description: request.Material.description,
            unit: request.Material.unit,
            stock_qty: request.Material.stockQty,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Talep durumu güncelle
router.patch(
  "/:id/status",
  auth,
  validate,
  activityLogger("update_request_status"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const request = await Request.findByPk(req.params.id, {
        include: [
          { model: Project, attributes: ["id", "projectName", "pypNumber"] },
        ],
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: "Talep bulunamadı",
        });
      }

      await request.update({ status });

      // Güncellenmiş talebi önbelleğe kaydet
      await requestCache.set(request.id, request);

      // Liste önbelleğini temizle
      await requestCache.flush();

      // WebSocket bildirimi gönder
      socketService.notifyRequestStatusChange(request.id, status, req.user.id);

      // Talep sahibine bildirim gönder
      socketService.sendNotification(request.userId, {
        type: "request_status_change",
        title: "Talep Durumu Güncellendi",
        message: `Talebinizin durumu ${status} olarak güncellendi.`,
        requestId: request.id,
      });

      res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Talepleri ara
router.get("/search", auth, cache("requests:search", 300), async (req, res) => {
  try {
    const { search, filters, sort, page = 1, limit = 10 } = req.query;

    const results = await searchService.search("request", {
      search,
      filters: filters ? JSON.parse(filters) : undefined,
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Arama geçmişini kaydet
    if (search) {
      await searchService.saveSearchHistory(req.user.id, "request", search);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Arama önerileri al
router.get(
  "/suggestions",
  auth,
  cache("requests:suggestions", 300),
  async (req, res) => {
    try {
      const { field, prefix } = req.query;

      const suggestions = await searchService.getSuggestions(
        "request",
        field,
        prefix,
        10
      );

      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  }
);

// Popüler aramaları al
router.get(
  "/popular-searches",
  auth,
  cache("requests:popular-searches", 3600),
  async (req, res) => {
    try {
      const { timeframe = "24h", limit = 10 } = req.query;

      const popularSearches = await searchService.getPopularSearches(
        "request",
        timeframe,
        parseInt(limit)
      );

      res.json(popularSearches);
    } catch (error) {
      res.status(500).json({ error: "Failed to get popular searches" });
    }
  }
);

module.exports = router;
