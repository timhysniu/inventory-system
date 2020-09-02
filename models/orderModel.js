const { v4 } = require("uuid");
const InventoryModel = require('./inventoryModel');

class OrderModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Fetch all orders including the associated product details.
   * @todo: This is not paginated and it probably should be.
   */
  async getOrders() {
    const productsSql = `
      select * from orders_product 
      where order_id in (select order_id from orders)
      order by created desc
    `;

    // create order products map
    const products = await this.db.query(productsSql, {});
    const reducer = (acc, product) => {
      const { order_id } = product;
      acc[order_id] = acc[order_id] ? acc[order_id] : [];
      acc[order_id].push(product);
      return acc;
    }
    const orderProducts = products.reduce(reducer, {});
    console.log(orderProducts)

    const orders = await this.db.find('orders', { sortBy: { key: 'created', order: 'desc'} });

    return orders.map(order => ({ 
      ...order, 
      products: orderProducts[order.order_id] 
    }));
    
  }

  /**
   * Fetch an order by ID
   * 
   * @param {string} order_id
   * @return {object} - order with products
   */
  async getById(order_id) {
    const order = await this.db.findOne('orders', { filters: { order_id }});
    order.products = await this.db.find('orders_product', { filters: { order_id }});
    return order;
  }

  /**
   * Returns true if all products have available inventory.
   * We are using `product.qty` as indicator of available qty.
   * 
   * @param {array} products 
   */
  async canPurchaseProducts(products) {
    const productIds = products.map(product => product.product_id);
    if(!productIds || productIds.length < 1) return false;

    // create map of available quantities for products requested
    const inventories = await this.db.findWhereIn('products', 'product_id', productIds);
    const mapReducer = (acc, product) => {
      const { product_id, qty } = product;
      acc[product_id] = qty;
      return acc;
    }

    const inventoryMap = inventories.reduce(mapReducer, {});
    for(let product of products) {
      const { product_id, qty } = product;
      inventoryMap[product_id] -= qty;
    }

    const hasNegativeQty = Object.values(inventoryMap)
      .filter(qty => qty < 0).length;

    // for all products, if after duducting requested qty we end up 
    // with non-negative inventory then these products can be purchased
    return !hasNegativeQty;
  }

  /**
   * Creates an order using a list of product inventories
   * as input. Creating an order will deduct quantities
   * from inventory.
   *
   * @param {object} data 
   */
  async createOrder(data) {
    const { products, email } = data;
    const order_id = data.order_id || v4();
    const orderPayload = { 
      order_id,
      email,
      order_status: 'new',
    };

    const orderProducts = products.map(product => ({
      order_id,
      ...product
    }));

    const productIds = products.map(product => product.product_id);
    const canAddOrder = await this.canPurchaseProducts(products);

    if(canAddOrder) {
      const insertedOrder = await this.db.insertOne('orders', orderPayload);
      const instertedProducts = await this.db.insertMany('orders_product', orderProducts);
      if(!insertedOrder || !instertedProducts) return false;
      
      const inventoryModel = new InventoryModel(this.db);
      await inventoryModel.refreshQuantity(productIds.join(','));

      const order = await this.getById(order_id);
      return order;
    }

    return false;
  }

  /**
   * Update order. Because if limited set of fields in order
   * it makes most sense to use this service to update order status
   * only. This may be extended later if needed to support other updates
   * 
   * CANCELLING ORDERS: This means that products purchased will be added
   *  back to the inventory. order status is changed from 'new' to 'cancelled'
   * 
   * @param {object} data 
   */
  async updateOrder(data) {
    const { order_id, order_status } = data;

    const order = await this.getById(order_id);
    console.log(order);
    const { products } = order;
    const productIds = products.map(product => product.product_id);

    // this is order cancellation. once a cancellation happens
    // we re-stock inventory. 
    if(order_status == 'cancelled' && order.order_status === 'new') {
      
      // if we want to derive correct inventory count we can just
      // tag this order as cancelled. Inventory re-calculation
      // using shipments and sold items takes into account cancelled orders.
      await this.db.updateOne('orders', { order_id }, { order_status });

      const inventoryModel = new InventoryModel(this.db);

      try {
        await inventoryModel.refreshQuantity(productIds.join(','));
      }
      catch(err) {
        console.log(err)
      }

      order.order_status = order_status;
      return order;
    }
    // re-instating order when status changed from 'cancelled'
    else if(order.order_status === 'cancelled' && order_status !== order.order_status) {
      // @todo we need proper handling of this on API level
      //
      // ASSUMPTION: cancelled orders cannot be re-instanted to reduce
      // complexity of this exercise. Re-instatic could set the status
      // to `new` but other statuses may need to be considered too 
      // (eg. shipped, processing, etc)
      throw new Error('not implemented')
    }
    else {
      throw new Error('status not updated. no change needed')
    }
  }
}

module.exports = OrderModel;
