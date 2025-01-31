const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { logger } = require("../services/loggerService");

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error("Authentication error:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      }
      res.status(500).json({ error: error.message });
    }
  };
};

function generateToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

module.exports = { auth, generateToken };
