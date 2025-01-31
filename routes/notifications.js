const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");

// Bildirimleri listele
router.get(
  "/",
  auth,
  activityLogger("list_notifications"),
  async (req, res, next) => {
    try {
      const { unread_only, page = 1, limit = 20 } = req.query;

      const where = {
        user_id: req.user.id,
      };

      if (unread_only === "true") {
        where.is_read = false;
      }

      const notifications = await Notification.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
      });

      res.json({
        data: {
          notifications: notifications.rows,
          pagination: {
            total: notifications.count,
            page: parseInt(page),
            total_pages: Math.ceil(notifications.count / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bildirimi okundu olarak işaretle
router.put(
  "/:id/read",
  auth,
  activityLogger("mark_notification_read"),
  async (req, res, next) => {
    try {
      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id,
        },
      });

      if (!notification) {
        const error = new Error("Bildirim bulunamadı");
        error.status = 404;
        throw error;
      }

      await notification.update({
        is_read: true,
        read_at: new Date(),
      });

      res.json({
        message: "Bildirim okundu olarak işaretlendi",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Tüm bildirimleri okundu olarak işaretle
router.put(
  "/read-all",
  auth,
  activityLogger("mark_all_notifications_read"),
  async (req, res, next) => {
    try {
      await Notification.update(
        {
          is_read: true,
          read_at: new Date(),
        },
        {
          where: {
            user_id: req.user.id,
            is_read: false,
          },
        }
      );

      res.json({
        message: "Tüm bildirimler okundu olarak işaretlendi",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Okunmuş bildirimleri sil
router.delete(
  "/read",
  auth,
  activityLogger("delete_read_notifications"),
  async (req, res, next) => {
    try {
      await Notification.destroy({
        where: {
          user_id: req.user.id,
          is_read: true,
        },
      });

      res.json({
        message: "Okunmuş bildirimler silindi",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
