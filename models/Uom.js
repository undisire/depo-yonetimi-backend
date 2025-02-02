const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Uom extends Model {}

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
