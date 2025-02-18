const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class InventoryTransaction extends Model {
  static associate(models) {
    this.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    this.belongsTo(models.InventoryItem, {
      foreignKey: "inventory_item_id",
      as: "inventory_item",
    });
    this.belongsTo(models.Material, {
      foreignKey: "material_id",
      as: "material",
    });
    this.belongsTo(models.Warehouse, {
      foreignKey: "warehouse_id",
      as: "warehouse",
    });
    this.belongsTo(models.Uom, { foreignKey: "uom_id", as: "uom" });
  }
}

InventoryTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    warehouse_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uom_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("in", "out"),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    before_quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    after_quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "InventoryTransaction",
    tableName: "inventory_transactions",
  }
);

module.exports = InventoryTransaction;
