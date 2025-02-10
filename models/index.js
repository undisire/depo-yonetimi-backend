const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

const models = {
  Material: require("./Material"),
  MaterialAttribute: require("./MaterialAttribute"),
  Request: require("./Request"),
  Delivery: require("./Delivery"),
  User: require("./User"),
  Project: require("./Project"),
  Warehouse: require("./Warehouse"),
  StockItem: require("./StockItem"),
  Uom: require("./Uom"),
  Institution: require("./Institution"),
  ProjectUser: require("./ProjectUser"),
  Employee: require("./Employee"),
  ProjectEmployee: require("./ProjectEmployee"),
  Role: require("./Role"),
};

Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
