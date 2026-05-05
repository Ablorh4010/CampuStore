
import { Pool } from 'pg';

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables found:", res.rows.map(r => r.table_name));
    
    const columnsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'");
    console.log("Columns in 'products':", columnsRes.rows.map(r => r.column_name));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkTables();
