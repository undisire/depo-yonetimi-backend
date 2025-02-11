const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Uom } = require("../models");

router.get("/", auth(), async (req, res) => {
  try {
    const uoms = await Uom.findAll();
    res.json({ data: uoms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const uom = await Uom.findByPk(id);
    res.json({ data: uom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth(), async (req, res) => {
  try {
    const { name, symbol } = req.body;
    const uom = await Uom.create({ name, symbol });
    res.json({ data: uom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol } = req.body;
    const uom = await Uom.findByPk(id);
    uom.name = name;
    uom.symbol = symbol;
    await uom.save();
    res.json({ data: uom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const uom = await Uom.findByPk(id);
    await uom.destroy();
    res.json({ data: uom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
