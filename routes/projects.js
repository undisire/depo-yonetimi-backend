const { auth } = require("../middleware/auth");
const { Project, Employee, Material, sequelize } = require("../models");
const { logger } = require("../services/loggerService");
const express = require("express");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { rows: projects, count } = await Project.findAndCountAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
                  SELECT COUNT(*) 
                  FROM project_employee AS pe
                  WHERE pe.project_id = Project.id
                )`),
            "employees_count",
          ],
        ],
      },
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({
      data: projects,
      meta: {
        total: count,
        page: parseInt(page),
        total_pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error("Error listing projects:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const employees_count = await project.countEmployees();

    res.json({
      data: {
        ...project.toJSON(),
        employees_count,
      },
    });
  } catch (error) {
    logger.error("Error getting project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    logger.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

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

router.get("/:id/employees", auth(), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const employees = await project.getEmployees({
      include: ["role"],
    });

    res.json({ data: employees });
  } catch (error) {
    logger.error("Error getting project users:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/employees", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const employee = await Employee.findByPk(req.body.employee_id);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    await project.addEmployee(employee.id, {
      through: {
        role_id: employee.role_id,
        employee_id: employee.id,
        project_id: project.id,
      },
    });

    res.json({ data: employee });
  } catch (error) {
    console.log(error);
    logger.error("Error adding user to project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/reserves", auth(["admin"]), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const reserves = await project.getReserves({
      include: [
        "inventory",
        "warehouse",
        {
          model: Material,
          as: "material",
          include: ["uom"],
        },
      ],
    });

    res.json({ data: reserves });
  } catch (error) {
    logger.error("Error adding user to project:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete(
  "/:id/employees/:employeeId",
  auth(["admin"]),
  async (req, res) => {
    try {
      const project = await Project.findByPk(req.params.id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const employee = await Employee.findByPk(req.params.employeeId);

      if (!employee) {
        return res.status(404).json({ error: "Rmployee not found" });
      }

      await project.removeEmployee(employee);

      res.status(204).send();
    } catch (error) {
      logger.error("Error removing employee from project:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
