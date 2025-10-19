const path = require('path');
require('dotenv').config();

const DB_FILE = process.env.SQLITE_PATH || path.join(__dirname, 'tbs.sqlite');

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: DB_FILE },
    useNullAsDefault: true
  },
  production: {
    client: 'better-sqlite3',
    connection: { filename: DB_FILE },
    useNullAsDefault: true
  }
};
