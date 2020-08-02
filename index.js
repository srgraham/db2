const mysql = require('mysql');
const _ = require('lodash');

class DB2 {
  constructor(config) {
    this.connection_pool = mysql.createPool({
      ...config.options,
      connectionLimit: config.connectionLimit || 100,
      host: config.host,
      user: config.user,
      password: config.pass,
      database: config.database,
    });
  }

  async getPoolConnection(){
    return new Promise((resGetPoolConnection, rejGetPoolConnection) => {
      this.connection_pool.getConnection((err, connection) => {
        if (err) {
          rejGetPoolConnection(err);
          return;
        }
        resGetPoolConnection(connection);
      })
    });
  };

  static format(query, binds=[]) {
    return mysql.format(query, binds);
  };

  // Populates ? in queries with their respective binds and runs the query
  // Grabs a single connection from the pool, runs your query and then returns the connection to the pool
  async execute(query, binds = []) {
    if (binds.length > 0) {
      if (_.isObject(query)) {
        query.sql = DB2.format(query.sql, binds);
      } else {
        query = DB2.format(query, binds);
      }
    }

    const conn = await this.getPoolConnection();

    return new Promise((resExecute, rejExecute) => {
      conn.query(query, (err, results) => {
        if (err) {
          console.error(err);
          rejExecute(err);
          return;
        }
        conn.release();
        resExecute(results);
      });
    });
  };

  async insert(table_name, row_obj) {
    const columns = _.keys(row_obj);
    const query = `
        INSERT INTO ${table_name} (${columns.join(',')})
        VALUES(${_.map(columns, () => '?')})
      `;
    const binds = _.values(row_obj);
    return await this.execute(query, binds);
  };

  async insertIgnore(table_name, row_obj) {
    const columns = _.keys(row_obj);
    const query = `
        INSERT IGNORE INTO ${table_name} (${columns.join(',')})
        VALUES(${_.map(columns, () => '?')})
      `;
    const binds = _.values(row_obj);
    return await this.execute(query, binds);
  };

  async insertIgnoreMulti(table_name, row_objs) {
    const row_chunks = _.chunk(row_objs, 1000);

    const insertChunk = async (row_objs_chunk) => {
      if (row_objs_chunk.length === 0) {
        return;
      }

      const columns = _.keys(row_objs_chunk[0]);

      const placeholder_row = `(${_.map(columns, () => '?').join(',')})`;
      const placeholder_all = _.map(row_objs_chunk, () => placeholder_row).join(',');

      const query = `
          INSERT IGNORE INTO ${table_name} (${columns.join(',')})
            VALUES
            ${placeholder_all}
        `;

      const binds = _.flatten(_.map(row_objs_chunk, (row_obj) => _.values(row_obj)));

      await this.execute(query, binds);
    };

    for (let i = 0; i < row_chunks.length; i += 1) {
      await insertChunk(row_chunks[i]);
    }
  };


  async update(table_name, id_where_obj, row_obj) {
    const columns = _.keys(row_obj);
    const binds = [];
    const sets = _.map(row_obj, (val, column) => {
      binds.push(val);
      return `${column} = ?`
    });

    const id_wheres = _.map(id_where_obj, (val, column) => {
      binds.push(val);
      return `${column} = ?`;
    });

    const query = `
        UPDATE ${table_name}
          SET ${sets.join(',')}
          WHERE ${id_wheres.join(',')}
          LIMIT 1
      `;
    return await this.execute(query, binds);
  };

  async insertOnDuplicateKeyUpdate(table_name, row_obj, ignored_update_columns) {
    const columns = _.keys(row_obj);
    const update_columns = _.without(columns, ...ignored_update_columns);
    const sets = _.map(update_columns, (column) => `${column} = ?`);
    const query = `
        INSERT INTO ${table_name} (${columns.join(',')})
          VALUES(${_.map(columns, () => '?')})
          ON DUPLICATE KEY UPDATE
          ${sets.join(',')}
      `;
    const binds = _.values(row_obj);

    _.each(update_columns, (column) => {
      binds.push(row_obj[column]);
    });

    if (update_columns.length === 0) {
      const err = new Error([
        'no columns to update when passed to insertOnDuplicateKeyUpdate()',
        'Maybe they\'re all ignored?',
        'Query:',
        query,
        'Binds:',
        `[${binds}]`,
      ].join('\n'));
      throw err;
    }
    return await this.execute(query, binds);
  };

  async insertOnDuplicateKeyUpdateMulti(table_name, row_obj_arr, ignore_update_columns) {
    for (let i = 0; i < row_obj_arr.length; i += 1) {
      await this.insertOnDuplicateKeyUpdate(table_name, row_obj_arr[i], ignore_update_columns);
    }
  };

  // creates a safe string version of an IN() query for use in SQL queries
  // results should be later used like this "... WHERE id IN(#{in_query)"
  static createIn(in_list) {
    return _.map(in_list, () => '?').join(',')
  };

  // creates a safe string version of an IN() query for use in SQL queries
  // results should be later used like this "... WHERE id IN(#{in_query)"
  static createLikeIn(column_name, in_list, joiner = 'OR') {
    if (in_list.length === 0) {
      return '0';
    }
    const placeholders = _.map(in_list, () => `${column_name} LIKE ?`);
    return `( ${placeholders.join(` ${joiner} `)} )`;
  };

  // creates a safe string version of an IN() query for use in SQL queries
  // results should be later used like this "... WHERE id IN(#{in_query)"
  static createRegexpIn(column_name, in_list, joiner = 'OR') {
    if (in_list.length === 0) {
      return '0';
    }
    const placeholders = _.map(in_list, () => `${column_name} REGEXP ?`);
    return `( ${placeholders.join(` ${joiner} `)} )`;
  };
}

module.exports = DB2;
