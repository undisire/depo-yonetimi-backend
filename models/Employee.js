const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Employee extends Model {
  static associate(models) {
    this.belongsTo(models.Role, {
      foreignKey: "role_id",
      as: "role",
    });

    this.belongsToMany(models.Project, {
      through: models.ProjectEmployee,
    });
  }
}

Employee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Employee",
    tableName: "employees",
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
    timestamps: true,
  }
);

module.exports = Employee;
