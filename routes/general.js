const Boom = require('boom');
const db = require('../lib/mysqldb');
const GeneralRoutes = (server) => {

  /**
   * Root route, used for testing only
   */
  server.route({
    method: 'GET',
    path: '/',
    handler: async (request, h) => {
      return 'works';
    }
  });

  /**
   * Remove all database test data
   */
  server.route({
    method: 'GET',
    path: '/flushdb',
    handler: async (request, h) => {
      try {
        const conn = db(request);
        await conn.query('delete from products', {});
        await conn.query('delete from orders', {});
        await conn.query('delete from shipment_product', {});
        await conn.query('delete from orders_product', {});
        return { success: true };
      } catch(err) {
        throw Boom.badData(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Remove all the database records',
      notes: 'Returns true if successful'
    }
  });
};

module.exports = GeneralRoutes;