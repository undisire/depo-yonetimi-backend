const Material = require("./Material");
const MaterialAttribute = require("./MaterialAttribute");
const Request = require("./Request");
const Delivery = require("./Delivery");
const User = require("./User");
const Project = require("./Project");
const Warehouse = require("./Warehouse");
const StockItem = require("./StockItem");
const Uom = require("./Uom");
const Institution = require("./Institution");
const sequelize = require("../config/database");

// İlişkileri tanımla
Material.hasMany(Request);
Request.belongsTo(Material);

Material.hasMany(MaterialAttribute, { as: "attributes" });
MaterialAttribute.belongsTo(Material);

Material.belongsTo(Uom, { as: "uom" });
Uom.hasMany(Material, { as: "materials" });

Request.hasMany(Delivery);
Delivery.belongsTo(Request);

User.hasMany(Request, { as: "requests", foreignKey: "requested_by" });
Request.belongsTo(User, { as: "requestedBy", foreignKey: "requested_by" });

User.hasMany(Delivery, { as: "deliveries", foreignKey: "delivered_by" });
Delivery.belongsTo(User, { as: "deliveredBy", foreignKey: "delivered_by" });

User.hasMany(Delivery, { as: "receivedDeliveries", foreignKey: "received_by" });
Delivery.belongsTo(User, { as: "receivedBy", foreignKey: "received_by" });

Project.hasMany(Request);
Request.belongsTo(Project);

module.exports = {
  Institution,
  Material,
  MaterialAttribute,
  Request,
  Delivery,
  User,
  Project,
  Warehouse,
  StockItem,
  Uom,
  sequelize,
};
