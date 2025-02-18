const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class InventoryReserve extends Model {
  static associate(models) {
    this.belongsTo(models.Material, {
      foreignKey: "material_id",
      as: "material",
    });

    this.belongsTo(models.Warehouse, {
      foreignKey: "warehouse_id",
      as: "warehouse",
    });

    this.belongsTo(models.InventoryItem, {
      foreignKey: "inventory_item_id",
      as: "inventory_item",
    });

    this.belongsTo(models.Project, {
      foreignKey: "project_id",
      as: "project",
    });

    this.belongsTo(models.Uom, {
      foreignKey: "uom_id",
      as: "uom",
    });
  }
}

InventoryReserve.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    warehouse_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    uom_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "InventoryReserve",
    tableName: "inventory_reserves",
  }
);

module.exports = InventoryReserve;
