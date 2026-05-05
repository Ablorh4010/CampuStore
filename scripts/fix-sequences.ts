import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

async function fixSequences() {
  const client = new Client({ connectionString });
  await client.connect();
  
  const tables = [
    'users', 'products', 'categories', 'stores', 'orders', 
    'order_items', 'cart_items', 'otp_codes', 'bookmarks',
    'events', 'clubs', 'study_groups', 'social_posts', 'comments'
  ];

  for (const table of tables) {
    try {
      const query = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id), 1)) FROM ${table};`;
      await client.query(query);
      console.log(`Fixed sequence for ${table}`);
    } catch (e) {
      console.log(`Skipping ${table}: ${e.message}`);
    }
  }

  await client.end();
}

fixSequences();
