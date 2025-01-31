const sequelize = require("./config/database");
const Project = require("./models/Project");
const Material = require("./models/Material");
const Request = require("./models/Request");
const Delivery = require("./models/Delivery");
const User = require("./models/User");
// const Warehouse = require("./models/Warehouse");

// İlişkileri tanımla
Request.belongsTo(Project, {
  foreignKey: "projectId",
  targetKey: "id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Request.belongsTo(Material, {
  foreignKey: "materialId",
  targetKey: "id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Project.hasMany(Request, {
  foreignKey: "projectId",
  sourceKey: "id",
});

Material.hasMany(Request, {
  foreignKey: "materialId",
  sourceKey: "id",
});

// Delivery ilişkileri
Request.hasOne(Delivery, {
  foreignKey: "requestId",
  sourceKey: "id",
});

Delivery.belongsTo(Request, {
  foreignKey: "requestId",
  targetKey: "id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// User ilişkileri
User.hasMany(Request, {
  foreignKey: "userId",
  sourceKey: "id",
});

Request.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Warehouse ilişkileri
// Warehouse.hasMany(Material, {
//   foreignKey: "warehouseId",
//   sourceKey: "id",
// });

// Material.belongsTo(Warehouse, {
//   foreignKey: "warehouseId",
//   targetKey: "id",
//   onDelete: "SET NULL",
//   onUpdate: "CASCADE",
// });

// Modelleri senkronize et
async function syncDatabase() {
  try {
    // Veritabanı bağlantısını kontrol et
    await sequelize.authenticate();
    console.log("Veritabanı bağlantısı başarılı");

    // Tüm modelleri birlikte senkronize et
    await sequelize.sync({ force: true });
    console.log("Tüm tablolar başarıyla oluşturuldu");

    // Örnek veriler ekle
    const project = await Project.create({
      code: 123,
      name: "Test Projesi",
      pypNumber: "PYP001",
    });

    const user = await User.create({
      full_name: "Test User",
      username: "testuser",
      email: "testuser@example.com",
      password: "password123",
    });

    // const warehouse = await Warehouse.create({
    //   name: "Ana Depo",
    //   location: "İstanbul",
    // });

    const material = await Material.create({
      materialCode: "MTL001",
      description: "Test Malzemesi",
      unit: "adet",
      stockQty: 100,
      // warehouseId: warehouse.id,
    });

    // Örnek talep oluştur
    const request = await Request.create({
      projectId: project.id,
      materialId: material.id,
      requestedQty: 10,
      status: "pending",
      userId: user.id,
    });

    console.log("Örnek veriler eklendi");
  } catch (error) {
    console.error("Veritabanı güncellenirken hata oluştu:", error);
  } finally {
    process.exit();
  }
}

syncDatabase();
