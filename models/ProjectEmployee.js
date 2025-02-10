const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class ProjectEmployee extends Model {
  static associate(models) {}
}

ProjectEmployee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ProjectEmployee",
    tableName: "project_employee",
    timestamps: true,
    index: [
      {
        unique: true,
        fields: ["project_id", "employee_id"],
      },
    ],
  }
);

module.exports = ProjectEmployee;
