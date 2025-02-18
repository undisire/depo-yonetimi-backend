const { auth } = require("../middleware/auth");
const { Warehouse } = require("../models");
const express = require("express");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll();
    res.json({ data: warehouses });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    res.json({ data: warehouse });
  } catch (e) {
    next(e);
  }
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.create(req.body);

    res.status(201).json({ data: warehouse });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    await warehouse.update(req.body);

    res.json({ data: warehouse });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    await warehouse.destroy();

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
