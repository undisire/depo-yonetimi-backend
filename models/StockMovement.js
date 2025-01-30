const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Materials',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('in', 'out'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  previous_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  new_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reference_type: {
    type: DataTypes.ENUM('delivery', 'adjustment', 'return'),
    allowNull: false
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'stock_movements'
});

module.exports = StockMovement;
