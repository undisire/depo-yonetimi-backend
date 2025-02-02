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

module.exports = router;
