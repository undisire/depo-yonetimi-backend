const { auth } = require("../middleware/auth");
const { Institution } = require("../models");
const express = require("express");

const router = express.Router();

router.get("/", auth(["admin"]), async (req, res, next) => {
  try {
    const institutions = await Institution.findAll();
    res.json({ data: institutions });
  } catch (e) {
    next(e);
  }
});

router.post("/", auth(["admin"]), async (req, res, next) => {
  try {
    const institution = await Institution.create(req.body);
    res.json(institution);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", auth(["admin"]), async (req, res, next) => {
  try {
    const institution = await Institution.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    res.json(institution);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth(["admin"]), async (req, res, next) => {
  try {
    const institution = await Institution.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.json(institution);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
