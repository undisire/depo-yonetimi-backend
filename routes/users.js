const { auth } = require("../middleware/auth");
const { User } = require("../models");
const express = require("express");

const router = express.Router();

function transformUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
  };
}

router.get("/", auth(["admin"]), async (req, res, next) => {
  try {
    const users = await User.findAll();

    res.json({
      data: users.map(transformUser),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", auth(["admin"]), async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      data: transformUser(user),
    });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", auth(["admin"]), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.update(req.body);

    res.json({
      data: transformUser(user),
    });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth(["admin"]), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.destroy();

    res.json({
      message: "User deleted",
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
