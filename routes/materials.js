const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Material, MaterialAttribute, Uom } = require("../models");
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
const sequelize = require("../config/database");

router.get(
  "/",
  auth(["admin"]),
  activityLogger("list_materials"),
  async (req, res, next) => {
    try {
      const search = new SearchBuilder(req.query)
        // Temel arama
        .addSearch(["sap_no", "name", "description"], req.query.search)
        .addInclude(Uom, {}, false, "uom")
        // Filtreleme
        .addFilter("unit", req.query.unit)
        .addNumberRange("stock_qty", req.query.min_stock, req.query.max_stock)
        // Sıralama
        .addOrder(req.query.sort_by || "id", req.query.sort_direction || "DESC")
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
        },
      }));

      res.json({
        data: materials,
        meta: {
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

router.get(
  "/:id",
  auth(["admin"]),
  activityLogger("view_material"),
  async (req, res, next) => {
    try {
      const material = await Material.findByPk(req.params.id, {
        include: [
          {
            model: MaterialAttribute,
            as: "attributes",
          },
        ],
      });

      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      res.json({
        data: material.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  auth(["admin"]),
  materialValidators.create,
  validate,
  activityLogger("create_material"),
  async (req, res, next) => {
    const t = await sequelize.transaction();

    try {
      const { code, name, uom_id, description, attributes, sap_no } = req.body;

      const material = await Material.create({
        uom_id,
        code,
        name,
        description,
        sap_no,
      });

      await MaterialAttribute.destroy({
        where: {
          material_id: material.id,
        },
      });

      await MaterialAttribute.bulkCreate(
        attributes.map((attr) => ({
          material_id: material.id,
          name: attr.name,
          value: attr.value,
        }))
      );

      await t.commit();

      res.status(201).json({
        message: "Malzeme başarıyla eklendi",
        data: material.toJSON(),
      });
    } catch (error) {
      await t.rollback();

      next(error);
    }
  }
);

router.put(
  "/:id",
  auth(["admin"]),
  materialValidators.update,
  validate,
  activityLogger("update_material"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { code, name, uom_id, description, attributes, sap_no } = req.body;

      const material = await Material.findByPk(id);

      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
        throw error;
      }

      await material.update({
        code,
        name,
        uom_id,
        description,
        sap_no,
      });

      await MaterialAttribute.destroy({
        where: {
          material_id: material.id,
        },
      });

      await MaterialAttribute.bulkCreate(
        attributes.map((attr) => ({
          material_id: material.id,
          name: attr.name,
          value: attr.value,
        }))
      );

      res.json({
        message: "Malzeme başarıyla güncellendi",
        data: material.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  auth(["admin"]),
  activityLogger("delete_material"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const material = await Material.findByPk(id);

      if (!material) {
        const error = new Error("Malzeme bulunamadı");
        error.status = 404;
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

module.exports = router;
