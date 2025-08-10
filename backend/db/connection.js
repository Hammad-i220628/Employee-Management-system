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
    trustServerCertificate: true,
    enableArithAbort: true,
    abortTransactionOnError: false // Changed to false to handle errors manually
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  requestTimeout: 30000, // Add request timeout
  connectionTimeout: 30000 // Add connection timeout
};

let pool;

const getConnection = async () => {
  try {
    if (pool && pool.connected) {
      return pool;
    }
    
    // Close existing pool if it exists but not connected
    if (pool && !pool.connected) {
      try {
        await pool.close();
      } catch (closeError) {
        console.log('Error closing existing pool:', closeError.message);
      }
    }
    
    console.log('Creating new database connection...');
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      pool = null; // Reset pool on error
    });
    
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    pool = null; // Reset pool on error
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