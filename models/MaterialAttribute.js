const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class MaterialAttribute extends Model {
  static associate(models) {
    this.belongsTo(models.Material, {
      foreignKey: "material_id",
      as: "material",
    });
  }
}

MaterialAttribute.init(
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
    sequelize,
    tableName: "material_attributes",
    timestamps: false,
  }
);

module.exports = MaterialAttribute;
