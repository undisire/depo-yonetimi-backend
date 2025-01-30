const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,     // Veritabanı adı
  process.env.DB_USER,     // PostgreSQL kullanıcı adı
  process.env.DB_PASSWORD, // PostgreSQL şifre
  {
    host: process.env.DB_HOST,   // Sunucu adresi (localhost)
    port: process.env.DB_PORT,   // PostgreSQL portu (varsayılan 5432)
    dialect: 'mysql',         // Kullanılan veritabanı türü
    logging: false,               // SQL sorgularını konsolda gösterme
    define: {
        underscored: true
    }
  }
);

module.exports = sequelize;