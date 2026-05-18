const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    await pool.connect();
    console.log('Connected!');
    const res = await pool.query('SELECT * FROM produtos LIMIT 5');
    console.log('Success! Rows:', res.rows);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await pool.end();
  }
}

run();
