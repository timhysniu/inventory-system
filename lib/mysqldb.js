const { constant } = require('lodash');

const Logger = require('./logger')();

/**
 * MySql wrapper that resembles mongoDB query syntax.
 * 
 * @author: Tim Hysniu
 * @param {object} req 
 * @param {bool} isDebug 
 * @return {object} - instance of mysqlwrapper
 */
const MysqlPool = (req, isDebug = true) => {
  const conn = req.getConn();

  const _whereItem = (conn, key, value) => {
    if (typeof (value) !== 'object') {
      return '`' + key + '` = ' + conn.escape(value);
    }
  
    if (Array.isArray(value.$in)) {
      return '`' + key + '` IN (' + value.$in.map(val => conn.escape(val)).join(', ') + ')';
    }
  
    return '';
  };

  /**
   * Escape a string
   * @param {string} - sql to escape
   * @return {string} - escaped sql
   */
  const escape = sql => conn.escape(sql);

  const getLimitSql = (limit, skip) => {
    if (!limit) return '';
    if (skip && limit) return `limit ${parseInt(skip, 10)}, ${parseInt(limit, 10)}`;
    return `limit ${parseInt(limit, 10)}`;
  };

  const getWhere = (filters = {}) => {
    const conditionFields = Object.keys(filters);
    const whereSql = conditionFields.map(field => '' + field + ' = ' + 
      escape(filters[field])).join(' AND ') || '1';

    return whereSql;
  };

  /**
   * Finds rows from a table matching condition. If no limit is
   * provided (or 0) then all rows matching condition are returned.
   *
   * @param {string} table - table name
   * @param {object} conditions - filter conditions
   * @param {int} limit - limit results
   * @returns {array} - array of rows
   */
  const find = (table, params = {}) => new Promise((resolve, reject) => {
    const { filters = {}, sortBy, limit, skip } = params;
    const conditionFields = Object.keys(filters);
    const whereSql = conditionFields.map(field => '`' + field + '` = ' + 
      conn.escape(filters[field])).join(' AND ') || '1';
    const limitSql = getLimitSql(limit, skip);
    const sortSql = !sortBy ? '' : `order by ${sortBy.key} ${sortBy.order === 'desc' ? 'desc' : 'asc'}`;
    const sql = `select * from ${table} where ${whereSql} ${sortSql} ${limitSql}`;
    Logger.log('find: ', sql);
    conn.query(sql, (error, results) => {
      if (error) reject(error);
      resolve(results);
    });
  });

  const findWhereIn = (table, fieldId, vals = []) => new Promise((resolve, reject) => {
    const valuesSql = vals.map(val => conn.escape(val)).join(', ');
    const whereSql = `${fieldId} in (${valuesSql})`
    const sql = `select * from ${table} where ${whereSql}`;
    Logger.log('findWhereIn: ', sql);
    conn.query(sql, (error, results) => {
      if (error) reject(error);
      resolve(results);
    });
  });

  /**
   * Finds one row in table matching condition. Same as find 
   * but limit to one. @see find()
   * 
   * @param {string} table - table name
   * @param {object} conditions - filter conditions
   * @returns {object} - row if found or null if nothing found 
   */
  const findOne = (table, conditions) => new Promise((resolve, reject) => {
    find(table, conditions, 1)
      .then((results) => {
        const row = Array.isArray(results) && results.length > 0 ? results[0] : null;
        resolve(row);
      })
      .catch(err => reject(err));
  });

  /**
   * Finds total count of a table with conditions
   * 
   * @param {string} table 
   * @param {object} conditions 
   * @returns {number} - count
   */
  const count = (table, conditions) => new Promise((resolve, reject) => {
    const conditionFields = Object.keys(conditions);
    const whereSql = conditionFields.map(field => '`' + field + '` = ' + 
      conn.escape(conditions[field])).join(' AND ') || '1';
    const sql = `select count(*) as c from ${table} where ${whereSql}`;
    Logger.log('find: ', sql);
    conn.query(sql, (error, results) => {
      if (error) reject(error);
      const totalCount = Array.isArray(results) && results.length > 0 ? results[0].c : null;
      resolve(totalCount);
    });
  });

  /**
   * Arbitrary query with any number of params, where params is
   * a map of params used in query.
   * 
   * Example query: "select * from users where user_id = $user_id" 
   *  with params object: { user_id: 1234 }
   *
   * @param {string} sql - custom sql query
   * @param {object} params - params used in sql query
   * @param {number} offset - offset
   * @param {number} limit - limit
   * @param {boolean} isDebug - is debug enable for this query
   * @return {array} - array of row objects if select
   */
  const query = (sql, params = {}, offset = 0, limit = false) => new Promise((resolve, reject) => {
    let sqlWithParams = sql;
    const fields = Object.keys(params);
    if (fields.length > 0) {
      // eslint-disable-next-line no-restricted-syntax
      for (const field of fields) {
        const regex = new RegExp('\\$' + field, 'g');
        sqlWithParams = sqlWithParams.replace(regex, conn.escape(params[field]));
      }
    }

    if (limit !== false) {
      sqlWithParams += ` limit ${parseInt(offset, 10)}, ${parseInt(limit, 10)}`;
    }

    if (isDebug) {
      Logger.log('query: ', sqlWithParams);
    }
    
    conn.query(sqlWithParams, (error, results) => {
      if (error) reject(error);
      resolve(results);
    });
  });

  const queryOne = (sql, params) => new Promise((resolve, reject) => {
    query(sql, params, 0, false, isDebug)
      .then(results => resolve(results[0]))
      .catch(err => reject(err));
  });

  /**
   * Insert one record into a table with data
   *
   * @param {string} table - table name
   * @param {object} data - data to insert where keys are columns
   */
  const insertOne = (table, data) => new Promise((resolve, reject) => {
    if (!data) {
      reject(new Error('invalid insert data'));
    }
    const fields = Object.keys(data).map(key => '`' + key + '`').join(', ');
    const values = Object.values(data).map(val => conn.escape(val)).join(', ');
    const sql = `insert ignore into ${table} (${fields}) values (${values})`;
    Logger.log('insertOne sql:', sql);
    conn.query(sql, (error, result) => {
      if (error) reject(error);
      const affected = result && result.affectedRows ? result.affectedRows : 0;
      resolve(affected);
    });
  });

  /**
   * Insert many records into a table with data
   *
   * @param {string} table - table name
   * @param {array} data - array of objects to insert where keys in objects are columns
   */
  const insertMany = (table, data) => new Promise((resolve, reject) => {
    if (!data || !Array.isArray(data) || data.length < 1) {
      reject(new Error('invalid insert data'));
    }
    const fields = Object.keys(data[0]).map(key => '`' + key + '`').join(', ');
    const lines = data.map(line => '(' + Object.values(line).map(val => conn.escape(val)).join(', ') + ')');
    const sql = `insert ignore into ${table} (${fields}) values ${lines.join(',')}`;
    Logger.log('insertMany sql:', sql);
    conn.query(sql, (error, result) => {
      if (error) reject(error);
      const affected = result && result.affectedRows ? result.affectedRows : 0;
      resolve(affected);
    });
  });

  /**
   * Update one record using conditions and data.
   *
   * @param {string} table - table name
   * @param {object} conditions - filters where keys are columns
   * @param {object} data - data to update where keys are columns
   * @param {int} limit - limits number to update or updates all if 0
   */
  const updateMany = (table, conditions, data, limit = 0) => new Promise((resolve, reject) => {
    if (!conditions) {
      reject(new Error('invalid filters data'));
    }
    if (!data) {
      reject(new Error('invalid update data'));
    }
    const conditionFields = Object.keys(conditions);
    const whereSql = conditionFields.map(field => '`' + field + '` = ' 
      + conn.escape(conditions[field])).join(' AND ') || '1';
    const updateSql = Object.keys(data).map(field => '`' + field + '` = ' 
      + conn.escape(data[field])).join(', ');
    const limitSql = limit ? `limit ${parseInt(limit, 10)}` : '';
    const sql = `update ${table} set ${updateSql} where ${whereSql} ${limitSql}`;
    Logger.log('update sql:', sql);
    conn.query(sql, (error, result) => {
      if (error) reject(error);
      const changed = result && result.changedRows ? result.changedRows : 0;
      resolve(changed);
    });
  });

  /**
   * Same as updateMany but only updates one record
   * @see updateMany
   */
  const updateOne = (table, conditions, data) => updateMany(table, conditions, data, 1);


  /**
   * Runs a delete and insert using replace directive. Used for upserts
   *
   * @param {string} table 
   * @param {object} data 
   */
  const replaceOne = (table, data) => new Promise((resolve, reject) => {
    if (!data) {
      reject(new Error('invalid replace data'));
    }

    const fields = Object.keys(data);
    const fieldsSql = fields.map(field => '`' + field + '`').join(', ');
    const dataSql = fields.map(field => conn.escape(data[field])).join(', '); 
    const sql = `replace into ${table} (${fieldsSql}) values(${dataSql})`;
    Logger.log('replace sql:', sql);
    conn.query(sql, (error, result) => {
      if (error) reject(error);
      const changed = result && result.changedRows ? result.changedRows : 0;
      resolve(changed);
    });
  });

    /**
   * Same as updateMany but only updates one record
   * @see replaceOne
   */
  const replaceMany = (table, data) => new Promise((resolve) => {
    data.forEach(row => replaceOne(table, row, 1));
    resolve(true);
  });

  /**
   * Delete one record from a table with conditions
   *
   * @param {string} table - table name
   * @param {object} conditions - conditions to check where keys are columns
   * @param {int} limit - limits number to update or updates all if 0
   */
  const deleteMany = (table, conditions, limit = 0) => new Promise((resolve, reject) => {
    if (!conditions) {
      reject(new Error('invalid filters data'));
    }
    const conditionFields = Object.keys(conditions);

    const whereSql = conditionFields.map(field => _whereItem(conn, field, conditions[field])).join(' AND ');
    const limitSql = limit ? `limit ${parseInt(limit, 10)}` : '';
    const sql = `delete from ${table} where ${whereSql} ${limitSql}`;
    Logger.log('delete sql:', sql);
    conn.query(sql, (error, result) => {
      if (error) reject(error);
      const affected = result && result.affectedRows ? result.affectedRows : 0;
      resolve(affected);
    });
  });

  /**
   * Same as deleteMany but deletes one record only
   * @see deleteMany
   */
  const deleteOne = (table, conditions) => deleteMany(table, conditions, 1);

  return {
    escape,
    find,
    findOne,
    findWhereIn,
    query,
    queryOne,
    deleteMany,
    deleteOne,
    insertOne,
    insertMany,
    updateMany,
    updateOne,
    replaceOne,
    replaceMany,
    count,
    getWhere
  };
};

module.exports = MysqlPool;
