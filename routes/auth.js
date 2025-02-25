const { body } = require("express-validator");
const { User } = require("../models");
const { auth, generateToken } = require("../middleware/auth");
const { validate } = require("../middleware/validators");
const express = require("express");

const router = express.Router();

// Kullanıcı kaydı
router.post(
  "/register",
  [
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
      const { email, password, full_name, role, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          email,
        },
      });

      if (existingUser) {
        const error = new Error("User already exists");
        error.status = 400;
        throw error;
      }

      const user = await User.create({
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
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });

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

router.post("/logout", auth(), async (req, res, next) => {
  try {
    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
});

// Kullanıcı profili
router.get("/user", auth(), async (req, res) => {
  try {
    res.json({
      data: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        phone: req.user.phone,
        last_login: req.user.last_login,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
