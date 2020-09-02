const Joi = require('joi');
const Boom = require('boom');
const { failAction } = require('../lib/common');
const db = require('../lib/mysqldb');
const Inventory = require('../models/inventoryModel');

const inventorySchema = Joi.object().keys({
  product_id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().positive().required(),
  qty: Joi.number().required(),
  created: Joi.date().optional(),
  last_updated: Joi.date().optional()
});

const InventoryRoutes = (server) => {

  /**
   * Get inventory items
   */
  server.route({
    method: 'GET',
    path: '/inventory',
    handler: async (request, h) => {
      try {
        const conn = db(request);
        const model = new Inventory(conn);
        return await model.getInventories();
      } catch(err) {
        throw Boom.badData(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Get inventories of all store products',
      notes: 'Returns an array of inventory items',
      response: {
        schema: Joi.array().items(inventorySchema),
        failAction
      }
    }
  });

  /**
   * Retrieve inventory for item ID
   */
  server.route({
    method: 'GET',
    path: '/inventory/{id}',
    handler: async (request, h) => {
      const id = request.params.id;
      try {
        const conn = db(request);
        const model = new Inventory(conn);
        const result = await model.getById(id);
        if(!result) return Boom.notFound('Page not found');
        return result;
      }
      catch (err) {
        throw Boom.badData(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Get inventories of a product by ID',
      notes: 'Returns an object inventory',
      response: {
        schema: inventorySchema,
        failAction
      }
    }
  });

  /**
   * Create inventory item
   */
  server.route({
    method: 'POST',
    path: '/inventory',
    handler: async function (request, h) {
      const conn = db(request);
      const payload = request.payload;
      const model = new Inventory(conn);

      try {
        const result = await model.createInventory(payload);
        console.log('createInventory', payload, result)
        if(!result) return Boom.notAcceptable('Could not create');
  
        

        // here we fetch the inserted value back from master connection pool
        // this is an extra call but can be justified if we want to ensure
        // the correctness of data that's added to db (eg. created date) 
        const { product: { product_id } } = result;
        return await model.getById(product_id);
      } catch(err) {
        throw Boom.badData(err.message);
      }

    },
    options: {
      tags: ['api'],
      description: 'Create an inventory item',
      notes: 'Returns inserted inventory item if successful',
      validate: {
        payload: inventorySchema
      },
      response: {
        schema: inventorySchema,
        failAction
      }
    }
  });

  /**
   * Update inventory item
   */
  server.route({
    method: 'PUT',
    path: '/inventory',
    handler: async function (request, h) {
      const conn = db(request);
      const payload = request.payload;
      const model = new Inventory(conn);

      try {
        const result = await model.updateInventory(payload);
        if(!result) return Boom.notAcceptable('Could not update');
  
        // we read the updated record back.
        // @see comment above on why we do this.
        const { product_id } = result;
        return await model.getById(product_id);
      } catch(err) {
        throw Boom.badData(err.message);
      }

    },
    options: {
      tags: ['api'],
      description: 'Update inventory item by ID',
      notes: 'Returns updated inventory item if successful',
      validate: {
        payload: inventorySchema
      },
      response: {
        schema: inventorySchema,
        failAction
      }
    }
  });
};

module.exports = InventoryRoutes;