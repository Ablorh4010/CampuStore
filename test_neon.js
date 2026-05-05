
import pkg from 'pg';
const { Pool } = pkg;

async function testConn() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  try {
    console.log("Attempting to connect to Neon...");
    const res = await pool.query("SELECT NOW()");
    console.log("Connection successful! Current time from DB:", res.rows[0].now);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

testConn();
