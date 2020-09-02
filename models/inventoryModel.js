const { v4 } = require("uuid");
const _omit = require('lodash/omit');

class InventoryModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Fetch all products by ID
   * 
   * @return {array}
   */
  async getInventories() {
    return await this.db.find('products');
  }

  /**
   * Fetch product by ID
   *
   * @param {string} product_id
   * @return {object}
   */
  async getById(product_id) {
    return await this.db.findOne('products', { filters: { product_id } });
  }

  /**
   * Creates an a product with initial inventory.
   *
   * @param {object} data 
   * @return {bool} - true if succesfully placed
   */
  async createInventory(data) {
    const { qty } = data;
    const product_id = data.product_id || v4();
    const payload = { 
      ...data,
      product_id
    };
    
    // first we are adding the product. If that is successful then
    // we create a shipment as well for qty provided.
    const added = await this.db.insertOne('products', payload);
    if(!added) return added;

    // ASSUMPTION: by creating an inventory item we are also adding a shipment
    // Typically shipments are handled via different endpoint but this is for demo only.
    const shipmentData = { 
      shipment_id: v4(),
      product_id, 
      qty 
    };

    await this.db.insertOne('shipment_product', shipmentData);

    return { 
      success: added, 
      product: payload, 
      shipment: shipmentData 
    };
  }

  /**
   * Refresh inventory qty for a product using shipments and placed
   * orders as fact tables. We do this to ensure data integrity
   * but also to have a history of all shipments and sold orders
   *
   * @param {string} comma separated product IDs
   */
  async refreshQuantity(product_id) {
    const idSql = product_id.split(',').map(id => this.db.escape(id));
    const sql = `
      update products p
      set qty = (select COALESCE(SUM(qty), 0) AS purchased from shipment_product
        where product_id = p.product_id) -
        (select COALESCE(SUM(op.qty), 0) AS sold 
         from orders_product op
         where op.product_id = p.product_id
          and op.order_id NOT IN 
           (select order_id from orders where order_status='cancelled')
        )
      where p.product_id IN (${idSql})
    `;

    await this.db.query(sql, { product_id });
  }

  /**
   * Updates product details
   *
   * @param {object} data
   * @return {bool} - returns true if updated
   */
  async updateInventory(data) {
    const { product_id } = data;
    const filters = { product_id };
    
    // we can update anything except qty
    const payload = _omit(data, ['qty']);

    return await this.db.updateOne('products', filters, payload);
  }
}

module.exports = InventoryModel;