import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function check() {
  const adminUser = await db.select().from(users).where(eq(users.id, 1));
  console.log("User 1 Data:", JSON.stringify(adminUser.map(u => ({ id: u.id, email: u.email, isAdmin: u.isAdmin })), null, 2));
}

check().catch(console.error).finally(() => process.exit());
