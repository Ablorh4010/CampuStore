
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function cleanupStores(email?: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment variables.");
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    const targetEmail = email || process.env.TARGET_EMAIL || 'kaydemghana@gmail.com';
    console.log(`Cleaning up stores for: ${targetEmail}`);
    
    const userRes = await pool.query("SELECT id, is_admin FROM users WHERE email = $1", [targetEmail]);
    if (userRes.rows.length === 0) {
      console.log(`User with email ${targetEmail} not found.`);
      return;
    }
    
    const user = userRes.rows[0];
    const userId = user.id;
    
    // Get all stores for this user, ordered by ID descending (newest first)
    const storeRes = await pool.query("SELECT id FROM stores WHERE user_id = $1 ORDER BY id DESC", [userId]);
    
    if (storeRes.rows.length === 0) {
      console.log("No stores found to clean up.");
      return;
    }
    
    const latestStoreId = storeRes.rows[0].id;
    const otherStoreIds = storeRes.rows.slice(1).map(r => r.id);
    
    if (otherStoreIds.length > 0) {
      console.log(`Keeping latest store (ID: ${latestStoreId}) and deleting ${otherStoreIds.length} others.`);
      
      for (const oldStoreId of otherStoreIds) {
        console.log(`Cleaning up store ID: ${oldStoreId}...`);
        
        // 1. Get products for this store
        const productRes = await pool.query("SELECT id FROM products WHERE store_id = $1", [oldStoreId]);
        const productIds = productRes.rows.map(r => r.id);
        
        if (productIds.length > 0) {
          // 2. Delete product dependencies
          await pool.query("DELETE FROM auction_bids WHERE auction_id IN (SELECT id FROM auctions WHERE product_id = ANY($1))", [productIds]);
          await pool.query("DELETE FROM auctions WHERE product_id = ANY($1)", [productIds]);
          await pool.query("DELETE FROM orders WHERE product_id = ANY($1)", [productIds]);
          await pool.query("DELETE FROM messages WHERE product_id = ANY($1)", [productIds]);
          await pool.query("DELETE FROM cart_items WHERE product_id = ANY($1)", [productIds]);
          await pool.query("DELETE FROM weekly_deals WHERE product_id = ANY($1)", [productIds]);
          await pool.query("DELETE FROM products WHERE store_id = $1", [oldStoreId]);
          console.log(`Deleted ${productIds.length} products and their dependencies.`);
        }
        
        // 3. Delete the store itself
        await pool.query("DELETE FROM stores WHERE id = $1", [oldStoreId]);
        console.log(`Deleted store ID: ${oldStoreId}.`);
      }
    } else {
      console.log(`Only one store found (ID: ${latestStoreId}). Keeping it.`);
    }
    
    // Auto-approve the store if user is admin
    if (user.is_admin) {
      await pool.query("UPDATE stores SET approval_status = 'approved' WHERE id = $1", [latestStoreId]);
      console.log(`Store ${latestStoreId} has been approved as the user is an administrator.`);
    } else {
      // For sellers, we might want to ensure it's at least 'pending' or 'approved' depending on your flow
      // But let's leave seller approval to the admin unless specified otherwise
      console.log(`Store ${latestStoreId} remains with its current status.`);
    }
    
    console.log("Cleanup complete.");
    
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await pool.end();
  }
}

// Allow running from command line with an email argument
const emailArg = process.argv[2];
cleanupStores(emailArg);
