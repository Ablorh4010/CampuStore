
import pkg from 'pg';
const { Pool } = pkg;

async function testConn() {
  const connectionString = "postgresql://neondb_owner:npg_x1LrwhoMig5E@ep-plain-pine-anl727mk.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";
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
