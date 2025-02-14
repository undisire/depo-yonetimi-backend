const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Inventory } = require("../models");

router.get("/", auth(["admin"]), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { rows: inventory, count } = await Inventory.findAndCountAll({
      include: ["material", "warehouse", "uom", "institution"],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({
      data: inventory,
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

router.post("/", auth(["admin"]), async (req, res, next) => {
  try {
    const inventory = await Inventory.create(req.body);
    res.json({ data: inventory });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
