const { auth } = require("../middleware/auth");
const { Uom } = require("../models");
const express = require("express");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  try {
    const uoms = await Uom.findAll();

    res.json({ data: uoms });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const { id } = req.params;

    const uom = await Uom.findByPk(id);

    if (!uom) {
      return res.status(404).json({ error: "Uom not found" });
    }

    res.json({ data: uom });
  } catch (e) {
    next(e);
  }
});

router.post("/", auth(), async (req, res) => {
  try {
    const { name, symbol } = req.body;

    const uom = await Uom.create({ name, symbol });

    res.json({ data: uom });
  } catch (e) {
    next(e);
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
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    const { id } = req.params;

    const uom = await Uom.findByPk(id);

    if (!uom) {
      return res.status(404).json({ error: "Uom not found" });
    }

    await uom.destroy();

    res.json({ data: uom });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
