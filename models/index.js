const Material = require('./Material');
const Request = require('./Request');
const Delivery = require('./Delivery');
const User = require('./User');
const Project = require('./Project');

// İlişkileri tanımla
Material.hasMany(Request);
Request.belongsTo(Material);

Request.hasMany(Delivery);
Delivery.belongsTo(Request);

User.hasMany(Request, { as: 'requests', foreignKey: 'requested_by' });
Request.belongsTo(User, { as: 'requestedBy', foreignKey: 'requested_by' });

User.hasMany(Delivery, { as: 'deliveries', foreignKey: 'delivered_by' });
Delivery.belongsTo(User, { as: 'deliveredBy', foreignKey: 'delivered_by' });

User.hasMany(Delivery, { as: 'receivedDeliveries', foreignKey: 'received_by' });
Delivery.belongsTo(User, { as: 'receivedBy', foreignKey: 'received_by' });

Project.hasMany(Request);
Request.belongsTo(Project);

module.exports = {
  Material,
  Request,
  Delivery,
  User,
  Project
};
