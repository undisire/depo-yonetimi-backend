const sequelize = require('./config/database');
const Project = require('./models/Project');
const Material = require('./models/Material');
const Request = require('./models/Request');
const Delivery = require('./models/Delivery');

// İlişkileri tanımla
Request.belongsTo(Project, {
  foreignKey: 'projectId',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Request.belongsTo(Material, {
  foreignKey: 'materialId',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Project.hasMany(Request, {
  foreignKey: 'projectId',
  sourceKey: 'id'
});

Material.hasMany(Request, {
  foreignKey: 'materialId',
  sourceKey: 'id'
});

// Delivery ilişkileri
Request.hasOne(Delivery, {
  foreignKey: 'requestId',
  sourceKey: 'id'
});

Delivery.belongsTo(Request, {
  foreignKey: 'requestId',
  targetKey: 'id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Modelleri senkronize et
async function syncDatabase() {
  try {
    // Veritabanı bağlantısını kontrol et
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı');

    // Tüm modelleri birlikte senkronize et
    await sequelize.sync({ force: true });
    console.log('Tüm tablolar başarıyla oluşturuldu');

    // Örnek veriler ekle
    const project = await Project.create({
      projectName: 'Test Projesi',
      pypNumber: 'PYP001'
    });

    const material = await Material.create({
      materialCode: 'MTL001',
      description: 'Test Malzemesi',
      unit: 'adet',
      stockQty: 100
    });

    // Örnek talep oluştur
    const request = await Request.create({
      projectId: project.id,
      materialId: material.id,
      requestedQty: 10,
      status: 'pending'
    });

    console.log('Örnek veriler eklendi');
  } catch (error) {
    console.error('Veritabanı güncellenirken hata oluştu:', error);
  } finally {
    process.exit();
  }
}

syncDatabase();