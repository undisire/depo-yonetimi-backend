const { auth } = require("../middleware/auth");
const {
  InventoryItem,
  InventoryTransaction,
  Material,
  sequelize,
} = require("../models");
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

    const { rows: inventory, count } = await InventoryItem.findAndCountAll({
      where,
      include: [
        {
          model: Material,
          as: "material",
          include: ["uom"],
          required: true,
        },
        "warehouse",
        "uom",
        "institution",
      ],
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
    const material = await Material.findByPk(req.body.material_id);

    req.body.uom_id = material.uom_id;

    const inventory = await InventoryItem.create(req.body);
    res.json({ data: inventory });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/quantity", auth(["admin"]), async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { quantity, operation, note } = req.body;

    const inventory = await InventoryItem.findByPk(id);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    let oldQuantity = inventory.quantity;
    let newQuantity = inventory.quantity;

    if (operation === "decrease") {
      newQuantity -= quantity;
    } else if (operation === "increase") {
      newQuantity += quantity;
    } else {
      newQuantity = quantity;
    }

    if (newQuantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    if (oldQuantity === newQuantity) {
      return res.json({ data: inventory });
    }

    await InventoryItem.update(
      { quantity: newQuantity },
      { where: { id, quantity: oldQuantity } }
    );

    const type = newQuantity > oldQuantity ? "in" : "out";

    await InventoryTransaction.create({
      user_id: req.user.id,
      material_id: inventory.material_id,
      inventory_item_id: inventory.id,
      warehouse_id: inventory.warehouse_id,
      uom_id: inventory.uom_id,
      type,
      action: "qty_update",
      quantity: Math.abs(newQuantity - oldQuantity),
      before_quantity: oldQuantity,
      after_quantity: newQuantity,
      note,
    });

    await t.commit();

    res.json({ data: inventory });
  } catch (e) {
    await t.rollback();

    next(e);
  }
});

module.exports = router;
