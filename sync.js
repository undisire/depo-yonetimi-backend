const { sequelize } = require("./models");

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
    await sequelize.sync({ force: false, alter: true });
    console.log("Tüm tablolar başarıyla oluşturuldu");

    // // Örnek veriler ekle
    // const project = await Project.create({
    //   code: 123,
    //   name: "Test Projesi",
    //   pypNumber: "PYP001",
    // });

    // const user = await User.create({
    //   full_name: "Test User",
    //   username: "testuser",
    //   email: "testuser@example.com",
    //   password: "password123",
    // });

    // const warehouse = await Warehouse.create({
    //   name: "Ana Depo",
    //   location: "İstanbul",
    // });

    // const material = await Material.create({
    //   materialCode: "MTL001",
    //   description: "Test Malzemesi",
    //   unit: "adet",
    //   stockQty: 100,
    //   // warehouseId: warehouse.id,
    // });

    // // Örnek talep oluştur
    // const request = await Request.create({
    //   projectId: project.id,
    //   materialId: material.id,
    //   requestedQty: 10,
    //   status: "pending",
    //   userId: user.id,
    // });

    console.log("Örnek veriler eklendi");
  } catch (error) {
    console.error("Veritabanı güncellenirken hata oluştu:", error);
  } finally {
    process.exit();
  }
}

syncDatabase();
