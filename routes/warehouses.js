const { auth } = require("../middleware/auth");
const { Warehouse } = require("../models");
const { logger } = require("../services/loggerService");

const express = require("express");
const router = express.Router();

// Depoları listele
router.get("/", auth(), async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll();
    res.json({ data: warehouses });
  } catch (error) {
    logger.error("Error listing warehouses:", error);
    res.status(500).json({ error: error.message });
  }
});

// Depo görüntüle
router.get("/:id", auth(), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    res.json(warehouse);
  } catch (error) {
    logger.error("Error viewing warehouse:", error);
    res.status(500).json({ error: error.message });
  }
});

// Depo ekle
router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.create(req.body);
    res.status(201).json(warehouse);
  } catch (error) {
    logger.error("Error adding warehouse:", error);
    res.status(500).json({ error: error.message });
  }
});

// Depo güncelle
router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    await warehouse.update(req.body);
    res.json(warehouse);
  } catch (error) {
    logger.error("Error updating warehouse:", error);
    res.status(500).json({ error: error.message });
  }
});

// Depo sil
router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    await warehouse.destroy();
    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting warehouse:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
