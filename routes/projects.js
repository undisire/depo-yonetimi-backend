const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Project, User, sequelize } = require("../models");
const { logger } = require("../services/loggerService");

// Projeleri listele
router.get("/", auth(), async (req, res) => {
  try {
    const projects = await Project.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
                  SELECT COUNT(*) 
                  FROM project_user AS pu
                  WHERE pu.project_id = Project.id AND pu.role = 'engineer'
                )`),
            "engineer_count",
          ],
          [
            sequelize.literal(`(
                  SELECT COUNT(*) 
                  FROM project_user AS pu
                  WHERE pu.project_id = Project.id AND pu.role = 'contractor'
                )`),
            "contractor_count",
          ],
        ],
      },
    });
    res.json({ data: projects });
  } catch (error) {
    logger.error("Error listing projects:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proje detayı
router.get("/:id", auth(), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const engineer_count = await project.countUsers({
      where: { role: "engineer" },
    });

    const contractor_count = await project.countUsers({
      where: { role: "contractor" },
    });

    res.json({
      data: {
        ...project.toJSON(),
        engineer_count,
        contractor_count,
      },
    });
  } catch (error) {
    logger.error("Error getting project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/users", auth(), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const users = await project.getUsers();
    res.json({ data: users });
  } catch (error) {
    logger.error("Error getting project users:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/users", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const user = await User.findByPk(req.body.user_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await project.addUser(user, {
      through: { role: req.body.role, project_id: project.id },
    });

    res.json({ data: user });
  } catch (error) {
    logger.error("Error adding user to project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni proje oluştur
router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    logger.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proje güncelle
router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    await project.update(req.body);
    res.json(project);
  } catch (error) {
    logger.error("Error updating project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/users", auth(), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const users = await project.getUsers();
    res.json(users);
  } catch (error) {
    logger.error("Error getting project users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proje sil
router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    await project.destroy();
    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id/users/:userId", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await project.removeUser(user);

    res.status(204).send();
  } catch (error) {
    logger.error("Error removing user from project:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
