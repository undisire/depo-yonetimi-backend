const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Material extends Model {
  static associate(models) {
    this.belongsTo(models.Uom, {
      foreignKey: "uom_id",
      as: "uom",
    });

    this.hasMany(models.MaterialAttribute, {
      foreignKey: "material_id",
      as: "attributes",
    });
  }
}

Material.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sap_no: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uom_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "materials",
    underscored: true,
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = Material;
