
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testSellerProcess() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found.");
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    const testEmail = 'test_seller_' + Date.now() + '@example.com';
    const testUsername = 'test_seller_' + Date.now();
    
    console.log(`1. Simulating Seller Registration for: ${testEmail}`);
    
    // Simulate user creation (similar to /api/auth/seller/register)
    const userRes = await pool.query(
      "INSERT INTO users (email, username, first_name, last_name, user_type, is_merchant, verification_status, university, city) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [testEmail, testUsername, 'Test', 'Seller', 'seller', true, 'pending', 'Test University', 'Accra']
    );
    
    const userId = userRes.rows[0].id;
    console.log(`   User created with ID: ${userId}`);
    
    console.log(`2. Simulating Store Auto-creation (as done in Dashboard.tsx)`);
    
    const storeRes = await pool.query(
      "INSERT INTO stores (user_id, name, description, city, university, approval_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [userId, "Test Seller's Store", "Official store for Test Seller", "Accra", "Test University", "waiting_verification"]
    );
    
    const storeId = storeRes.rows[0].id;
    console.log(`   Store created with ID: ${storeId}`);
    
    console.log(`3. Verifying /api/stores/user query result`);
    const checkStoreRes = await pool.query("SELECT * FROM stores WHERE user_id = $1", [userId]);
    
    if (checkStoreRes.rows.length === 1 && checkStoreRes.rows[0].id === storeId) {
      console.log("   ✅ SUCCESS: Store is correctly linked to the user and retrievable.");
    } else {
      console.log("   ❌ FAILURE: Store not found or multiple stores found for the user.");
      console.log("   Found stores:", checkStoreRes.rows);
    }
    
    // Cleanup test data
    console.log("4. Cleaning up test data...");
    await pool.query("DELETE FROM stores WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    console.log("   Test data removed.");
    
  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await pool.end();
  }
}

testSellerProcess();
