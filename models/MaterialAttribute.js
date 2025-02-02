const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MaterialAttribute = sequelize.define(
  "MaterialAttribute",
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "material_attributes",
    timestamps: false,
  }
);

module.exports = MaterialAttribute;
