const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Project extends Model {
  static associate(models) {
    this.belongsToMany(models.Employee, { through: models.ProjectEmployee });
    this.hasMany(models.InventoryReserve, {
      foreignKey: "project_id",
      as: "reserves",
    });
  }
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM("tesis", "ket"),
      allowNull: false,
    },
    pyp_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "cancelled"),
      defaultValue: "active",
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Project",
    tableName: "projects",
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
    timestamps: true,
  }
);

module.exports = Project;
