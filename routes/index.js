const inventoryRoutes = require('./inventory');
const orderRoutes = require('./order');
const generalRoutes = require('./general');

const initRoutes = (server) => {
  orderRoutes(server);
  inventoryRoutes(server);
  generalRoutes(server);
};

module.exports = { initRoutes };