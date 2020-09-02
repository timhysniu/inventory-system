const Joi = require('joi');
const Boom = require('boom');
const { v4 } = require('uuid');
const Order = require('../models/orderModel');
const { failAction } = require('../lib/common');
const db = require('../lib/mysqldb');

const orderSchema = Joi.object().keys({
  order_id: Joi.string().required(),
  email: Joi.string().required(),
  order_status: Joi.string().valid('new', 'cancelled').required(),
  created: Joi.date().required(),
  last_updated: Joi.date().optional(),
  products: Joi.array().required()
});

const updateOrder = async () => {};

const OrderRoutes = (server) => {

  /**
   * Retrieve all orders
   */
  server.route({
    method: 'GET',
    path: '/orders',
    handler: async (request, h) => {
      try {
        const conn = db(request);
        const model = new Order(conn);
        return await model.getOrders();
      } catch(err) {
        throw Boom.badData(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Get all store orders',
      notes: 'Returns an array of order items',
      response: {
        schema: Joi.array().items(orderSchema),
        failAction
      }
    }
  });

  /**
   * Retrieve order for item ID
   */
  server.route({
    method: 'GET',
    path: '/order/{id}',
    handler: async (request, h) => {
      const id = request.params.id;
      const conn = db(request);
      const model = new Order(conn);
      return await model.getById(id);
    },
    options: {
      tags: ['api'],
      description: 'Get order by ID',
      notes: 'Returns an object order',
      response: {
        schema: orderSchema,
        failAction
      }
    }
  });

  /**
   * Create a new order
   */
  server.route({
    method: 'POST',
    path: '/order',
    handler: async function (request, h) {
      try {
        const conn = db(request);
        const model = new Order(conn);
        const payload = request.payload;
        const created = await model.createOrder(payload);
        if(!created) {
          throw Boom.notAcceptable("could not create order. preconditions failed");
        }

        return created;
      } catch(err) {
        throw Boom.notAcceptable(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Create an order',
      notes: 'Returns new order if successfully placed',
      validate: {
        payload: Joi.object({
          email: Joi.string().min(3).max(128),
          products: Joi.array().items(
            Joi.object().keys({
              product_id: Joi.string(),
              qty: Joi.number()
            })
          )
        })
      },
      response: {
        schema: orderSchema,
        failAction
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/order',
    handler: async function (request, h) {
      try {
        const conn = db(request);
        const model = new Order(conn);
        const payload = request.payload;
        const updatedOrder = await model.updateOrder(payload);
        if(!updatedOrder) {
          throw Boom.notAcceptable("could not update order");
        }

        return updatedOrder;
      } catch(err) {
        throw Boom.notAcceptable(err.message);
      }
    },
    options: {
      tags: ['api'],
      description: 'Update order by ID',
      notes: 'Returns updated order if successful',
      validate: {
        payload: Joi.object({
          order_id: Joi.string(),
          order_status: Joi.string().valid('new', 'cancelled')
        })
      },
      response: {
        schema: orderSchema,
        failAction
      }
    }
  });
};

module.exports = OrderRoutes;