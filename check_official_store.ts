import { db } from "./server/db";
import { stores, users } from "./shared/schema";
import { eq, ilike } from "drizzle-orm";

async function check() {
  const allStores = await db.select().from(stores).where(ilike(stores.name, '%University Hub%'));
  console.log("Found Stores:", JSON.stringify(allStores, null, 2));
  
  const admins = await db.select().from(users).where(eq(users.isAdmin, true));
  console.log("Admin Users:", JSON.stringify(admins.map(u => ({ id: u.id, email: u.email })), null, 2));
}

check().catch(console.error).finally(() => process.exit());
