import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  university: text("university").notNull(),
  campus: text("campus"),
  city: text("city").notNull(),
  password: text("password"),
  phoneNumber: text("phone_number").unique(),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isMerchant: boolean("is_merchant").default(false),
  isAdmin: boolean("is_admin").default(false),
  avatar: text("avatar"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  university: text("university").notNull(),
  campus: text("campus"),
  city: text("city").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  condition: text("condition").notNull(),
  images: text("images").array().notNull(),
  specialOffer: text("special_offer"),
  isAvailable: boolean("is_available").default(true),
  approvalStatus: text("approval_status").notNull().default("pending"), // pending, approved, rejected
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull().references(() => users.id),
  toId: integer("to_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isPhoneVerified: true,
  isAdmin: true,
}).extend({
  campus: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phoneNumber: z.string().optional(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
}).extend({
  campus: z.string().optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  viewCount: true,
  approvalStatus: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOtpSchema = createInsertSchema(otpCodes).omit({
  id: true,
  used: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;

// Extended types for API responses
export type ProductWithStore = Product & {
  store: Store & { user: Pick<User, 'firstName' | 'lastName' | 'avatar'> };
  category: Category;
};

export type StoreWithUser = Store & {
  user: Pick<User, 'firstName' | 'lastName' | 'avatar'>;
  productCount: number;
};

export type OrderWithDetails = Order & {
  product: Product;
  buyer: Pick<User, 'firstName' | 'lastName' | 'email'>;
  seller: Pick<User, 'firstName' | 'lastName' | 'email'>;
};

export type CartItemWithProduct = CartItem & {
  product: ProductWithStore;
};
