const sql = require('mssql');
require('dotenv').config({ path: './config.env' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

module.exports = {
  sql,
  getConnection,
  closeConnection
}; 