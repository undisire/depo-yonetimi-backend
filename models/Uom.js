const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Uom extends Model {
  static associate(models) {
    this.hasMany(models.Material, {
      foreignKey: "uom_id",
      as: "materials",
    });
  }
}

Uom.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    symbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Uom",
    tableName: "uoms",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Uom;
