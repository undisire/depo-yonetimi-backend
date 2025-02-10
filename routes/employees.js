const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Employee } = require("../models");
const { logger } = require("../services/loggerService");

router.get("/", auth(), async (req, res) => {
  try {
    const employes = await Employee.findAll({
      include: ["role"],
    });
    res.json({ data: employes });
  } catch (error) {
    logger.error("Error listing employes:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const employe = await Employee.findByPk(req.params.id);
    if (!employe) {
      return res.status(404).json({ error: "Employe not found" });
    }

    res.json({ data: employe });
  } catch (error) {
    logger.error("Error getting employe:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const employe = await Employee.create(req.body);
    res.json({ data: employe });
  } catch (error) {
    logger.error("Error creating employe:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const employe = await Employee.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    res.json({ data: employe });
  } catch (error) {
    logger.error("Error updating employe:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const employe = await Employee.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.json({ data: employe });
  } catch (error) {
    logger.error("Error deleting employe:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
