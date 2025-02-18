require("dotenv").config();
const { Sequelize } = require("sequelize");

const config = {
  dialect: "mysql",
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: false,
  define: {
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  },
};

const sequelize = new Sequelize(config);

module.exports = sequelize;
