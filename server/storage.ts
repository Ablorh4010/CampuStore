import {
  users, stores, categories, products, orders, messages, cartItems,
  type User, type InsertUser, type Store, type InsertStore, type Category,
  type Product, type InsertProduct, type Order, type InsertOrder,
  type Message, type InsertMessage, type CartItem, type InsertCartItem,
  type ProductWithStore, type StoreWithUser, type OrderWithDetails, type CartItemWithProduct
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // Stores
  createStore(store: InsertStore): Promise<Store>;
  getStoreById(id: number): Promise<Store | undefined>;
  getStoresByUserId(userId: number): Promise<Store[]>;
  getStoresWithUser(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]>;
  getFeaturedStores(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductWithStore(id: number): Promise<ProductWithStore | undefined>;
  getProductsByStoreId(storeId: number): Promise<Product[]>;
  getProductsWithStore(filters?: { 
    categoryId?: number; 
    search?: string; 
    limit?: number;
    userUniversity?: string;
    userCity?: string; 
    userCampus?: string;
  }): Promise<ProductWithStore[]>;
  getFeaturedProducts(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<ProductWithStore[]>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByBuyerId(buyerId: number): Promise<OrderWithDetails[]>;
  getOrdersBySellerId(sellerId: number): Promise<OrderWithDetails[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number, productId?: number): Promise<Message[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  markMessageAsRead(id: number): Promise<boolean>;

  // Cart
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  getCartByUserId(userId: number): Promise<CartItemWithProduct[]>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      campus: insertUser.campus || null
    }).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values({
      ...insertStore,
      campus: insertStore.campus || null
    }).returning();
    return store;
  }

  async getStoreById(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store || undefined;
  }

  async getStoresByUserId(userId: number): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.userId, userId));
  }

  async getStoresWithUser(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]> {
    let query = db
      .select({
        id: stores.id,
        userId: stores.userId,
        name: stores.name,
        description: stores.description,
        university: stores.university,
        campus: stores.campus,
        city: stores.city,
        rating: stores.rating,
        reviewCount: stores.reviewCount,
        isActive: stores.isActive,
        createdAt: stores.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
        productCount: sql<number>`COUNT(${products.id})::int`
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(products, eq(stores.id, products.storeId))
      .where(eq(stores.isActive, true))
      .groupBy(stores.id, users.id);

    if (filters) {
      const conditions = [eq(stores.isActive, true)];
      if (filters.userUniversity) {
        conditions.push(eq(stores.university, filters.userUniversity));
      }
      if (filters.userCity) {
        conditions.push(eq(stores.city, filters.userCity));
      }
      if (filters.userCampus) {
        conditions.push(eq(stores.campus, filters.userCampus));
      }
      
      if (conditions.length > 1) {
        query = query.where(and(...conditions));
      }
    }

    return await query as any[];
  }

  async getFeaturedStores(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]> {
    const allStores = await this.getStoresWithUser(filters);
    return allStores.slice(0, 6);
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined> {
    const [store] = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return store || undefined;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductWithStore(id: number): Promise<ProductWithStore | undefined> {
    const [result] = await db
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        title: products.title,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        condition: products.condition,
        images: products.images,
        isAvailable: products.isAvailable,
        viewCount: products.viewCount,
        createdAt: products.createdAt,
        store: {
          id: stores.id,
          userId: stores.userId,
          name: stores.name,
          description: stores.description,
          university: stores.university,
          campus: stores.campus,
          city: stores.city,
          rating: stores.rating,
          reviewCount: stores.reviewCount,
          isActive: stores.isActive,
          createdAt: stores.createdAt,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
            avatar: users.avatar,
          }
        },
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
        }
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));

    return result as any || undefined;
  }

  async getProductsByStoreId(storeId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.storeId, storeId));
  }

  async getProductsWithStore(filters?: { 
    categoryId?: number; 
    search?: string; 
    limit?: number;
    userUniversity?: string;
    userCity?: string; 
    userCampus?: string;
  }): Promise<ProductWithStore[]> {
    let query = db
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        title: products.title,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        condition: products.condition,
        images: products.images,
        isAvailable: products.isAvailable,
        viewCount: products.viewCount,
        createdAt: products.createdAt,
        store: {
          id: stores.id,
          userId: stores.userId,
          name: stores.name,
          description: stores.description,
          university: stores.university,
          campus: stores.campus,
          city: stores.city,
          rating: stores.rating,
          reviewCount: stores.reviewCount,
          isActive: stores.isActive,
          createdAt: stores.createdAt,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
            avatar: users.avatar,
          }
        },
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
        }
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const conditions = [eq(products.isAvailable, true), eq(stores.isActive, true)];

    if (filters) {
      if (filters.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }
      
      if (filters.search) {
        conditions.push(
          or(
            like(products.title, `%${filters.search}%`),
            like(products.description, `%${filters.search}%`)
          )!
        );
      }

      // Location-based filtering with priority
      if (filters.userUniversity || filters.userCity || filters.userCampus) {
        const locationConditions = [];
        
        if (filters.userCampus) {
          locationConditions.push(eq(stores.campus, filters.userCampus));
        }
        
        if (filters.userUniversity) {
          locationConditions.push(eq(stores.university, filters.userUniversity));
        }
        
        if (filters.userCity) {
          locationConditions.push(eq(stores.city, filters.userCity));
        }
        
        if (locationConditions.length > 0) {
          conditions.push(or(...locationConditions)!);
        }
      }
    }

    query = query.where(and(...conditions));

    // Order by location proximity
    if (filters?.userUniversity || filters?.userCity || filters?.userCampus) {
      query = query.orderBy(
        sql`CASE 
          WHEN ${stores.campus} = ${filters?.userCampus || ''} THEN 1
          WHEN ${stores.university} = ${filters?.userUniversity || ''} THEN 2
          WHEN ${stores.city} = ${filters?.userCity || ''} THEN 3
          ELSE 4
        END, ${desc(products.createdAt)}`
      );
    } else {
      query = query.orderBy(desc(products.createdAt));
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query as any[];
  }

  async getFeaturedProducts(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<ProductWithStore[]> {
    return await this.getProductsWithStore({ ...filters, limit: 8 });
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByBuyerId(buyerId: number): Promise<OrderWithDetails[]> {
    return await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(eq(orders.buyerId, buyerId)) as any[];
  }

  async getOrdersBySellerId(sellerId: number): Promise<OrderWithDetails[]> {
    return await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.sellerId, users.id))
      .where(eq(orders.sellerId, sellerId)) as any[];
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number, productId?: number): Promise<Message[]> {
    let query = db
      .select()
      .from(messages)
      .where(
        and(
          or(
            and(eq(messages.fromId, user1Id), eq(messages.toId, user2Id)),
            and(eq(messages.fromId, user2Id), eq(messages.toId, user1Id))
          ),
          productId ? eq(messages.productId, productId) : sql`TRUE`
        )!
      )
      .orderBy(desc(messages.createdAt));

    return await query;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(messages)
      .where(and(eq(messages.toId, userId), eq(messages.isRead, false)));
    
    return result?.count || 0;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const result = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const [cartItem] = await db.insert(cartItems).values(insertCartItem).returning();
    return cartItem;
  }

  async getCartByUserId(userId: number): Promise<CartItemWithProduct[]> {
    return await db
      .select()
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId)) as any[];
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const [cartItem] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return cartItem || undefined;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();