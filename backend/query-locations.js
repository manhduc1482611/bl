const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1
  });
  try {
    const [rows] = await pool.query("SELECT location_code,node_id,building,specific_location,floor,description,type FROM Locations WHERE building LIKE '%cổng%' OR specific_location LIKE '%cổng%' OR description LIKE '%cổng%' OR node_id = 3 OR location_code = 3 LIMIT 50");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
