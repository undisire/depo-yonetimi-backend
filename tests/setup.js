const { sequelize } = require('../config/database');

// Test veritabanı bağlantısını kapat
afterAll(async () => {
  await sequelize.close();
});

// Her testten önce veritabanını temizle
beforeEach(async () => {
  await sequelize.sync({ force: true });
});
