// backend/config/db.js
require('dotenv').config(); 
const sql = require('mssql');

// Try with sa first
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// If sa doesn't work, use posuser
// const config = {
//     user: 'posuser',
//     password: 'pos123',
//     server: 'localhost',
//     database: 'POSDatabase',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true
//     }
// };

let pool = null;

const connectDB = async () => {
    try {
        console.log('🔄 Connecting to AWS RDS SQL Server...');
        console.log('📍 Server:', config.server);
        console.log('📍 Database:', config.database);
        console.log('📍 User:', config.user);
        
        pool = await sql.connect(config);
        console.log('✅ Connected to AWS RDS SQL Server');
        
        // Test query
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('📊 SQL Server Version:', result.recordset[0].version);
        
        return pool;
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('📝 Details:', err);
        throw err;
    }
};

const getPool = () => {
    if (!pool) throw new Error('Database not connected');
    return pool;
};

module.exports = { connectDB, getPool, sql };