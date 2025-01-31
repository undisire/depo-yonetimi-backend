const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../models/User");
const { auth, generateToken } = require("../middleware/auth");
const { validate } = require("../middleware/validators");

// Kullanıcı kaydı
router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("full_name").trim().notEmpty().withMessage("Full name is required"),
    body("role")
      .isIn(["admin", "depocu", "muhendis", "taseron"])
      .withMessage("Invalid role"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { username, email, password, full_name, role, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }],
        },
      });

      if (existingUser) {
        const error = new Error("User already exists");
        error.status = 400;
        throw error;
      }

      const user = await User.create({
        username,
        email,
        password,
        full_name,
        role,
        phone,
      });

      const token = generateToken(user);

      res.status(201).json({
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı girişi
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({ where: { username } });

      if (!user || !user.is_active) {
        const error = new Error("Invalid credentials");
        error.status = 401;
        throw error;
      }

      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        const error = new Error("Invalid credentials");
        error.status = 401;
        throw error;
      }

      // Update last login
      await user.update({ last_login: new Date() });

      const token = generateToken(user);

      res.json({
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı profili
router.get("/profile", auth, async (req, res) => {
  res.json({
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        phone: req.user.phone,
        last_login: req.user.last_login,
      },
    },
  });
});

// Şifre değiştirme
router.put(
  "/change-password",
  auth,
  [
    body("current_password")
      .notEmpty()
      .withMessage("Current password is required"),
    body("new_password")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body;

      const isValidPassword = await req.user.validatePassword(current_password);

      if (!isValidPassword) {
        const error = new Error("Current password is incorrect");
        error.status = 401;
        throw error;
      }

      await req.user.update({ password: new_password });

      res.json({
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
