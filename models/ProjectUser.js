const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class ProjectUser extends Model {
  static associate(models) {}
}

ProjectUser.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("admin", "engineer", "warehouse", "contractor"),
      defaultValue: "engineer",
    },
  },
  {
    sequelize,
    modelName: "ProjectUser",
    tableName: "project_user",
    timestamps: true,
    index: [
      {
        unique: true,
        fields: ["project_id", "user_id"],
      },
    ],
  }
);

module.exports = ProjectUser;
