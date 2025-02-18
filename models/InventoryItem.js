const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class InventoryItem extends Model {
  static associate(models) {
    this.belongsTo(models.Material, {
      foreignKey: "material_id",
      as: "material",
    });

    this.belongsTo(models.Warehouse, {
      foreignKey: "warehouse_id",
      as: "warehouse",
    });

    this.belongsTo(models.Uom, {
      foreignKey: "uom_id",
      as: "uom",
    });

    this.belongsTo(models.Institution, {
      foreignKey: "institution_id",
      as: "institution",
    });

    this.hasMany(models.InventoryReserve, {
      foreignKey: "inventory_item_id",
      as: "reservations",
    });
  }
}

InventoryItem.init(
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
    uom_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    institution_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    item_type: {
      type: DataTypes.ENUM("whole", "part"),
      allowNull: false,
      defaultValue: "whole",
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    reserved_quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: "InventoryItem",
    tableName: "inventory_items",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = InventoryItem;
