const { auth } = require("../middleware/auth");
const { InventoryReserve, Material } = require("../models");
const { Op } = require("sequelize");
const express = require("express");

const router = express.Router();

router.get("/", auth(["admin"]), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { "$material.name$": { [Op.like]: `%${search}%` } },
        { "$warehouse.name$": { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows: inventoryReserves, count } =
      await InventoryReserve.findAndCountAll({
        where,
        include: [
          {
            model: Material,
            as: "material",
            required: true,
          },
          "warehouse",
          "uom",
          "project",
        ],
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
      });

    res.json({
      data: inventoryReserves,
      meta: {
        total: count,
        page: parseInt(page),
        total_pages: Math.ceil(count / limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
