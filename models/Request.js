const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project');
const Material = require('./Material');

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requestedQty: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  revisedQty: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.ENUM('pending', 'revised', 'approved', 'delivered'), 
    defaultValue: 'pending' 
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Materials',
      key: 'id'
    }
  }
}, {
  tableName: 'requests',
  underscored: true,
  timestamps: true
});

// İlişkiler
Project.hasMany(Request);
Request.belongsTo(Project);
Material.hasMany(Request);
Request.belongsTo(Material);

module.exports = Request;