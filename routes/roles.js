const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Role } = require("../models");
const { logger } = require("../services/loggerService");

router.get("/", auth(), async (req, res) => {
  try {
    const type = req.query?.type;
    const roles = await Role.findAll({
      where: type ? { type } : {},
    });
    res.json({ data: roles });
  } catch (error) {
    logger.error("Error listing role:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({ data: role });
  } catch (error) {
    logger.error("Error getting role:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.json({ data: role });
  } catch (error) {
    logger.error("Error creating role:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const role = await Role.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    res.json({ data: role });
  } catch (error) {
    logger.error("Error updating role:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const role = await Role.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.json({ data: role });
  } catch (error) {
    logger.error("Error deleting role:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
