const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo một "pool" kết nối để tối ưu hiệu suất
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;