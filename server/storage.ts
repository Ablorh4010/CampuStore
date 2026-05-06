import {
  users, stores, categories, products, orders, messages, cartItems, otpCodes,
  events, eventRsvps, clubs, clubMemberships, auctions, auctionBids,
  studyGroups, studyGroupMemberships, userFollows, sellerReviews,
  badges, userBadges, userPoints, pointsHistory,
  weeklyDeals, campusActivity, appConfig, bookmarks,
  type User, type InsertUser, type Store, type InsertStore, type Category,
  type Product, type InsertProduct, type Order, type InsertOrder,
  type Message, type InsertMessage, type CartItem, type InsertCartItem,
  type ProductWithStore, type StoreWithUser, type OrderWithDetails, type CartItemWithProduct,
  type OtpCode, type InsertOtp,
  type WeeklyDeal, type WeeklyDealWithProduct, type InsertWeeklyDeal,
  type CampusActivity, type CampusActivityWithUser, type InsertCampusActivity,
  type SellerReview, type InsertSellerReview
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, sql, gte, inArray, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  deleteUserByEmail(email: string): Promise<boolean>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByWhatsapp(whatsappNumber: string): Promise<User | undefined>;
  generateOtp(email: string): Promise<string>;
  generateWhatsappOtp(phoneNumber: string): Promise<string>;
  verifyOtp(email: string, code: string): Promise<boolean>;
  verifyWhatsappOtp(phoneNumber: string, code: string): Promise<boolean>;
  markEmailAsVerified(email: string): Promise<void>;
  markWhatsappAsVerified(phoneNumber: string): Promise<void>;
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  getAnalytics(): Promise<{
    totalUsers: number;
    totalStores: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  }>;

  // Stores
  createStore(store: InsertStore): Promise<Store>;
  getStoreById(id: number): Promise<Store | undefined>;
  getStoresByUserId(userId: number): Promise<Store[]>;
  getStoresWithUser(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]>;
  getFeaturedStores(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]>;
  getPendingStores(): Promise<StoreWithUser[]>;
  getAllStoresForAdmin(): Promise<StoreWithUser[]>;
  getPendingLogoChanges(): Promise<StoreWithUser[]>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined>;
  updateStoreApprovalStatus(id: number, status: string): Promise<Store | undefined>;
  approveLogoChange(id: number): Promise<Store | undefined>;
  rejectLogoChange(id: number): Promise<Store | undefined>;
  deleteStore(id: number): Promise<boolean>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: { name: string; icon: string; color: string; parentId?: number | null }): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;

  // Bookmarks
  createBookmark(bookmark: any): Promise<any>;
  getBookmarksByUserId(userId: number): Promise<any[]>;
  updateBookmarkStatus(id: number, status: string): Promise<any>;
  deleteBookmark(id: number): Promise<boolean>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;
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
  getPendingProducts(): Promise<ProductWithStore[]>;
  getAllProductsForAdmin(): Promise<ProductWithStore[]>;
  updateProductApprovalStatus(id: number, status: string): Promise<Product | undefined>;
  updateProductEligibility(id: number, isEligible: boolean): Promise<Product | undefined>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByReference(reference: string): Promise<Order[]>;
  getOrderWithDetails(id: number): Promise<OrderWithDetails | undefined>;
  getOrdersByBuyerId(buyerId: number): Promise<OrderWithDetails[]>;
  getOrdersBySellerId(sellerId: number): Promise<OrderWithDetails[]>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderTracking(id: number, trackingData: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDeliveryDate?: Date | string;
    trackingHistory?: string;
    deliveryStatus?: string;
  }): Promise<Order | undefined>;

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

  // Weekly Deals
  getWeeklyDeals(): Promise<WeeklyDealWithProduct[]>;
  createWeeklyDeal(deal: InsertWeeklyDeal): Promise<WeeklyDeal>;
  deleteWeeklyDeal(id: number): Promise<boolean>;

  // Campus Activity
  getCampusActivities(): Promise<CampusActivityWithUser[]>;
  createCampusActivity(activity: InsertCampusActivity): Promise<CampusActivity>;
  deleteCampusActivity(id: number): Promise<boolean>;
  // Installments
  getActiveInstallmentOrders(): Promise<Order[]>;
  // Reviews
  createSellerReview(review: InsertSellerReview): Promise<SellerReview>;
  getReviewsBySellerId(sellerId: number): Promise<SellerReview[]>;
  // App Config
  getAppConfig(key: string): Promise<string | undefined>;
  setAppConfig(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = { ...insertUser };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    // Convert dateOfBirth string to Date object if needed
    if (userData.dateOfBirth && typeof userData.dateOfBirth === 'string') {
      userData.dateOfBirth = new Date(userData.dateOfBirth);
    }

    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async getUserByWhatsapp(whatsappNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber));
    return user || undefined;
  }

  async generateOtp(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(otpCodes).values({
      email,
      code,
      expiresAt,
      otpType: 'email',
    });

    return code;
  }

  async generateWhatsappOtp(phoneNumber: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(otpCodes).values({
      phoneNumber,
      code,
      expiresAt,
      otpType: 'whatsapp',
    });

    return code;
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          eq(otpCodes.otpType, 'email'),
          gte(otpCodes.expiresAt, new Date())
        )
      );

    if (!otpRecord) return false;

    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));
    return true;
  }

  async verifyWhatsappOtp(phoneNumber: string, code: string): Promise<boolean> {
    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phoneNumber, phoneNumber),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          eq(otpCodes.otpType, 'whatsapp'),
          gte(otpCodes.expiresAt, new Date())
        )
      );

    if (!otpRecord) return false;

    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));
    return true;
  }

  async markEmailAsVerified(email: string): Promise<void> {
    await db.update(users).set({ isEmailVerified: true }).where(eq(users.email, email));
  }

  async markWhatsappAsVerified(phoneNumber: string): Promise<void> {
    await db.update(users).set({ isWhatsappVerified: true }).where(eq(users.whatsappNumber, phoneNumber));
  }

  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.email, email));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gte(users.resetTokenExpiry, new Date())
        )
      );
    return user || undefined;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.getUserByResetToken(token);
    if (!user) return false;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, user.id));
    
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, true));
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // 1. Delete user's stores (and their dependencies)
      const userStores = await this.getStoresByUserId(id);
      for (const store of userStores) {
        await this.deleteStore(store.id);
      }

      // 2. Delete user's bookmarks
      await db.delete(bookmarks).where(eq(bookmarks.userId, id));

      // 3. Delete user's messages
      await db.delete(messages).where(or(eq(messages.fromId, id), eq(messages.toId, id)));

      // 4. Finally delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }

  async getAnalytics(): Promise<{
    totalUsers: number;
    totalStores: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  }> {
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(users);
    const [storeCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(stores);
    const [productCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(products);
    const [orderCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(orders);
    const [revenueSum] = await db.select({ sum: sql<number>`SUM(CAST(total_amount AS DECIMAL))::float` }).from(orders).where(eq(orders.status, 'completed'));

    return {
      totalUsers: userCount?.count || 0,
      totalStores: storeCount?.count || 0,
      totalProducts: productCount?.count || 0,
      totalOrders: orderCount?.count || 0,
      totalRevenue: revenueSum?.sum || 0,
    };
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

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async deleteUserByEmail(email: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.email, email));
    return (result.rowCount || 0) > 0;
  }

  async updateUser(id: number, data: Partial<any>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }


  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values({
      ...insertStore,
      campus: insertStore.campus || null,
      approvalStatus: 'waiting_verification'
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
    const conditions = [eq(stores.isActive, true), eq(stores.approvalStatus, 'approved')];
    
    let baseQuery = db
      .select({
        id: stores.id,
        userId: stores.userId,
        name: stores.name,
        description: stores.description,
        logoUrl: stores.logoUrl,
        pendingLogoUrl: stores.pendingLogoUrl,
        university: stores.university,
        campus: stores.campus,
        city: stores.city,
        rating: stores.rating,
        reviewCount: stores.reviewCount,
        isActive: stores.isActive,
        approvalStatus: stores.approvalStatus,
        createdAt: stores.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
        userEmail: users.email,
        userPhoneNumber: users.phoneNumber,
        userIdScanUrl: users.idScanUrl,
        userFaceScanUrl: users.faceScanUrl,
        productCount: sql<number>`COUNT(${products.id})::int`
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(products, eq(stores.id, products.storeId))
      .where(and(...conditions))
      .groupBy(stores.id, users.id);

    if (filters?.userUniversity || filters?.userCity || filters?.userCampus) {
      baseQuery = baseQuery.orderBy(
        sql`CASE 
          WHEN ${stores.campus} = ${filters?.userCampus || ''} THEN 1
          WHEN ${stores.university} = ${filters?.userUniversity || ''} THEN 2
          WHEN ${stores.city} = ${filters?.userCity || ''} THEN 3
          ELSE 4
        END`, desc(stores.createdAt)
      ) as any;
    } else {
      baseQuery = baseQuery.orderBy(desc(stores.createdAt)) as any;
    }

    const results = await baseQuery;

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      university: row.university,
      campus: row.campus,
      city: row.city,
      rating: row.rating,
      reviewCount: row.reviewCount,
      isActive: row.isActive,
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
      user: {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        avatar: row.userAvatar,
        email: row.userEmail,
        phoneNumber: row.userPhoneNumber,
        idScanUrl: row.userIdScanUrl,
        faceScanUrl: row.userFaceScanUrl,
      },
      productCount: row.productCount
    })) as any[];
  }

  async getFeaturedStores(filters?: { userUniversity?: string; userCity?: string; userCampus?: string }): Promise<StoreWithUser[]> {
    const allStores = await this.getStoresWithUser(filters);
    return allStores.slice(0, 6);
  }

  async getPendingStores(): Promise<StoreWithUser[]> {
    const conditions = [eq(stores.approvalStatus, 'pending')];

    const results = await db
      .select({
        id: stores.id,
        userId: stores.userId,
        name: stores.name,
        description: stores.description,
        logoUrl: stores.logoUrl,
        pendingLogoUrl: stores.pendingLogoUrl,
        university: stores.university,
        campus: stores.campus,
        city: stores.city,
        rating: stores.rating,
        reviewCount: stores.reviewCount,
        isActive: stores.isActive,
        approvalStatus: stores.approvalStatus,
        createdAt: stores.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
        userEmail: users.email,
        userPhoneNumber: users.phoneNumber,
        userIdScanUrl: users.idScanUrl,
        userFaceScanUrl: users.faceScanUrl,
        productCount: sql<number>`COUNT(${products.id})::int`
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(products, eq(stores.id, products.storeId))
      .where(and(...conditions))
      .groupBy(stores.id, users.id);

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      university: row.university,
      campus: row.campus,
      city: row.city,
      rating: row.rating,
      reviewCount: row.reviewCount,
      isActive: row.isActive,
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
      user: {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        avatar: row.userAvatar,
        email: row.userEmail,
        phoneNumber: row.userPhoneNumber,
        idScanUrl: row.userIdScanUrl,
        faceScanUrl: row.userFaceScanUrl,
      },
      productCount: row.productCount
    })) as any[];
  }

  async getAllStoresForAdmin(): Promise<StoreWithUser[]> {
    const results = await db
      .select({
        id: stores.id,
        userId: stores.userId,
        name: stores.name,
        description: stores.description,
        logoUrl: stores.logoUrl,
        pendingLogoUrl: stores.pendingLogoUrl,
        university: stores.university,
        campus: stores.campus,
        city: stores.city,
        rating: stores.rating,
        reviewCount: stores.reviewCount,
        isActive: stores.isActive,
        approvalStatus: stores.approvalStatus,
        createdAt: stores.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
        userEmail: users.email,
        userPhoneNumber: users.phoneNumber,
        userIdScanUrl: users.idScanUrl,
        userFaceScanUrl: users.faceScanUrl,
        productCount: sql<number>`COUNT(${products.id})::int`
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(products, eq(stores.id, products.storeId))
      .orderBy(desc(stores.createdAt))
      .groupBy(stores.id, users.id);

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      pendingLogoUrl: row.pendingLogoUrl,
      university: row.university,
      campus: row.campus,
      city: row.city,
      rating: row.rating,
      reviewCount: row.reviewCount,
      isActive: row.isActive,
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
      user: {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        avatar: row.userAvatar,
        email: row.userEmail,
        phoneNumber: row.userPhoneNumber,
        idScanUrl: row.userIdScanUrl,
        faceScanUrl: row.userFaceScanUrl,
      },
      productCount: row.productCount
    })) as any[];
  }

  async getPendingLogoChanges(): Promise<StoreWithUser[]> {
    const results = await db
      .select({
        id: stores.id,
        userId: stores.userId,
        name: stores.name,
        description: stores.description,
        logoUrl: stores.logoUrl,
        pendingLogoUrl: stores.pendingLogoUrl,
        university: stores.university,
        campus: stores.campus,
        city: stores.city,
        rating: stores.rating,
        reviewCount: stores.reviewCount,
        isActive: stores.isActive,
        approvalStatus: stores.approvalStatus,
        createdAt: stores.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
        userEmail: users.email,
        userPhoneNumber: users.phoneNumber,
        userIdScanUrl: users.idScanUrl,
        userFaceScanUrl: users.faceScanUrl,
        productCount: sql<number>`COUNT(${products.id})::int`
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(products, eq(stores.id, products.storeId))
      .where(sql`${stores.pendingLogoUrl} IS NOT NULL`)
      .groupBy(stores.id, users.id);

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      pendingLogoUrl: row.pendingLogoUrl,
      university: row.university,
      campus: row.campus,
      city: row.city,
      rating: row.rating,
      reviewCount: row.reviewCount,
      isActive: row.isActive,
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
      user: {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        avatar: row.userAvatar,
        email: row.userEmail,
        phoneNumber: row.userPhoneNumber,
        idScanUrl: row.userIdScanUrl,
        faceScanUrl: row.userFaceScanUrl,
      },
      productCount: row.productCount
    })) as any[];
  }

  async approveLogoChange(id: number): Promise<Store | undefined> {
    const store = await this.getStoreById(id);
    if (!store || !store.pendingLogoUrl) return undefined;

    const [updatedStore] = await db
      .update(stores)
      .set({ 
        logoUrl: store.pendingLogoUrl,
        pendingLogoUrl: null 
      })
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async rejectLogoChange(id: number): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set({ pendingLogoUrl: null })
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined> {
    const [store] = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return store || undefined;
  }

  async updateStoreApprovalStatus(id: number, status: string): Promise<Store | undefined> {
    const [store] = await db
      .update(stores)
      .set({ approvalStatus: status })
      .where(eq(stores.id, id))
      .returning();
    return store || undefined;
  }

  async updateStoreIsActive(id: number, isActive: boolean): Promise<Store | undefined> {
    const [store] = await db
      .update(stores)
      .set({ isActive })
      .where(eq(stores.id, id))
      .returning();
    return store || undefined;
  }

  async deleteStore(id: number): Promise<boolean> {
    // Delete all products and their related data first to satisfy foreign key constraints
    const storeProducts = await db.select().from(products).where(eq(products.storeId, id));
    for (const product of storeProducts) {
      await db.delete(orders).where(eq(orders.productId, product.id));
      await db.delete(messages).where(eq(messages.productId, product.id));
      await db.delete(cartItems).where(eq(cartItems.productId, product.id));
    }
    
    await db.delete(products).where(eq(products.storeId, id));
    const result = await db.delete(stores).where(eq(stores.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: { name: string; icon: string; color: string; parentId?: number | null }): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Unlink products from this category first to default category 1
    await db.update(products).set({ categoryId: 1 }).where(eq(products.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  async createBookmark(insertBookmark: any): Promise<any> {
    const [bookmark] = await db.insert(bookmarks).values(insertBookmark).returning();
    return bookmark;
  }

  async getBookmarksByUserId(userId: number): Promise<any[]> {
    return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
  }

  async updateBookmarkStatus(id: number, status: string): Promise<any> {
    const [bookmark] = await db.update(bookmarks).set({ status }).where(eq(bookmarks.id, id)).returning();
    return bookmark;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    const result = await db.delete(bookmarks).where(eq(bookmarks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async bulkCreateProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    if (insertProducts.length === 0) return [];
    const createdProducts = await db.insert(products).values(insertProducts).returning();
    return createdProducts;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductWithStore(id: number): Promise<ProductWithStore | undefined> {
    const [result] = await db
      .select({
        product: products,
        store: stores,
        user: users,
        category: categories
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));

    if (!result) return undefined;

    return {
      ...result.product,
      store: {
        ...result.store!,
        user: {
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          avatar: result.user!.avatar,
        }
      },
      category: result.category!
    };
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
    const conditions = [
      eq(products.isAvailable, true), 
      eq(stores.isActive, true),
      eq(products.approvalStatus, 'approved'),
      eq(stores.approvalStatus, 'approved')
    ];

    if (filters?.categoryId) {
      // Get all categories to find children
      const allCategories = await this.getAllCategories();
      const childIds = allCategories
        .filter(c => c.parentId === filters.categoryId)
        .map(c => c.id);
      
      if (childIds.length > 0) {
        conditions.push(or(eq(products.categoryId, filters.categoryId), inArray(products.categoryId, childIds))!);
      } else {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(products.title, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )!
      );
    }

    // Location-based filtering with priority (Non-strict to avoid empty pages)
    // We only apply strict filtering if explicitly requested, but here we want to show everything with local items first
    
    let baseQuery = db
      .select({
        product: products,
        store: stores,
        user: users,
        category: categories
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));

    if (filters?.userUniversity || filters?.userCity || filters?.userCampus) {
      baseQuery = baseQuery.orderBy(
        sql`CASE 
          WHEN ${stores.campus} = ${filters?.userCampus || ''} THEN 1
          WHEN ${stores.university} = ${filters?.userUniversity || ''} THEN 2
          WHEN ${stores.city} = ${filters?.userCity || ''} THEN 3
          ELSE 4
        END`, desc(products.createdAt)
      ) as any;
    } else {
      baseQuery = baseQuery.orderBy(desc(products.createdAt)) as any;
    }

    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit) as any;
    }

    const results = await baseQuery;

    return results
      .filter(result => result.product && result.store && result.user && result.category)
      .map(result => ({
        ...result.product,
        store: {
          ...result.store!,
          user: {
            firstName: result.user!.firstName,
            lastName: result.user!.lastName,
            avatar: result.user!.avatar,
          }
        },
        category: result.category!
      }));
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

  async getPendingProducts(): Promise<ProductWithStore[]> {
    const results = await db
      .select({
        product: products,
        store: stores,
        user: users,
        category: categories
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.approvalStatus, 'pending'))
      .orderBy(desc(products.createdAt));

    return results.map(result => ({
      ...result.product,
      store: {
        ...result.store!,
        user: {
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          avatar: result.user!.avatar,
        }
      },
      category: result.category!
    }));
  }

  async getAllProductsForAdmin(): Promise<ProductWithStore[]> {
    const results = await db
      .select({
        product: products,
        store: stores,
        user: users,
        category: categories
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));

    return results.map(result => ({
      ...result.product,
      store: {
        ...result.store!,
        user: {
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          avatar: result.user!.avatar,
        }
      },
      category: result.category!
    }));
  }

  async updateProductApprovalStatus(id: number, status: string): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ approvalStatus: status })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async updateProductEligibility(id: number, isEligible: boolean): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ isInstallmentEligible: isEligible })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderData = { ...insertOrder };
    if (orderData.estimatedDeliveryDate && typeof orderData.estimatedDeliveryDate === 'string') {
      orderData.estimatedDeliveryDate = new Date(orderData.estimatedDeliveryDate);
    }
    const [order] = await db.insert(orders).values(orderData as any).returning();
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByReference(reference: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.paymentReference, reference));
  }

  async getOrderWithDetails(id: number): Promise<OrderWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    if (!result) return undefined;

    const seller = await this.getUserById(result.orders.sellerId);
    if (!seller) return undefined;

    return {
      ...result.orders,
      product: {
        ...result.products!,
        category: result.categories!
      },
      buyer: {
        firstName: result.users?.firstName || '',
        lastName: result.users?.lastName || '',
        email: result.users?.email || '',
      },
      seller: {
        firstName: seller.firstName,
        lastName: seller.lastName,
        email: seller.email,
        bankName: seller.bankName,
        bankAccountNumber: seller.bankAccountNumber,
        mobileMoneyPhone: seller.mobileMoneyPhone,
      }
    };
  }

  async getOrdersByBuyerId(buyerId: number): Promise<OrderWithDetails[]> {

    const results = await db
      .select({
        order: orders,
        product: products,
        seller: users,
        category: categories
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(orders.buyerId, buyerId));

    return results.map(result => ({
      ...result.order,
      product: {
        ...result.product!,
        category: result.category!
      },
      buyer: { firstName: '', lastName: '', email: '' }, 
      seller: {
        firstName: result.seller!.firstName,
        lastName: result.seller!.lastName,
        email: result.seller!.email,
        bankName: result.seller!.bankName,
        bankAccountNumber: result.seller!.bankAccountNumber,
        mobileMoneyPhone: result.seller!.mobileMoneyPhone,
      }
    }));
  }

  async getOrdersBySellerId(sellerId: number): Promise<OrderWithDetails[]> {
    const results = await db
      .select({
        order: orders,
        product: products,
        buyer: users,
        category: categories
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(orders.sellerId, sellerId));

    const seller = await this.getUserById(sellerId);

    return results.map(result => ({
      ...result.order,
      product: {
        ...result.product!,
        category: result.category!
      },
      seller: { 
        firstName: seller?.firstName || '', 
        lastName: seller?.lastName || '', 
        email: seller?.email || '',
        bankName: seller?.bankName || null,
        bankAccountNumber: seller?.bankAccountNumber || null,
        mobileMoneyPhone: seller?.mobileMoneyPhone || null,
      },
      buyer: {
        firstName: result.buyer!.firstName,
        lastName: result.buyer!.lastName,
        email: result.buyer!.email,
      }
    }));
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async updateOrderTracking(id: number, data: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDeliveryDate?: Date | string;
    trackingHistory?: string;
    deliveryStatus?: string;
  }): Promise<Order | undefined> {
    const updateData: any = { ...data };
    if (updateData.estimatedDeliveryDate && typeof updateData.estimatedDeliveryDate === 'string') {
      updateData.estimatedDeliveryDate = new Date(updateData.estimatedDeliveryDate);
    }
    const [order] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
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

  async getUserConversations(userId: number): Promise<any[]> {
    // This is a more complex query to get unique conversations with last message
    const conversations = await db.execute(sql`
      WITH LastMessages AS (
        SELECT 
          CASE WHEN from_id = ${userId} THEN to_id ELSE from_id END as other_user_id,
          content,
          created_at,
          is_read,
          from_id,
          ROW_NUMBER() OVER(PARTITION BY CASE WHEN from_id = ${userId} THEN to_id ELSE from_id END ORDER BY created_at DESC) as rn
        FROM messages
        WHERE from_id = ${userId} OR to_id = ${userId}
      )
      SELECT 
        lm.other_user_id as "userId",
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.avatar as "avatar",
        u.user_type as "userType",
        lm.content as "lastMessage",
        lm.created_at as "timestamp",
        lm.is_read as "isRead",
        lm.from_id as "lastMessageFromId"
      FROM LastMessages lm
      JOIN users u ON lm.other_user_id = u.id
      WHERE lm.rn = 1
      ORDER BY lm.created_at DESC
    `);

    return conversations.rows;
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const [cartItem] = await db.insert(cartItems).values(insertCartItem).returning();
    return cartItem;
  }

  async getCartByUserId(userId: number): Promise<CartItemWithProduct[]> {
    const results = await db
      .select({
        cartItem: cartItems,
        product: products,
        store: stores,
        user: users,
        category: categories
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(stores.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId));

    return results.map(result => ({
      ...result.cartItem,
      product: {
        ...result.product!,
        store: {
          ...result.store!,
          user: {
            firstName: result.user!.firstName,
            lastName: result.user!.lastName,
            avatar: result.user!.avatar,
          }
        },
        category: result.category!
      }
    }));
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

  // Weekly Deals
  async getWeeklyDeals(): Promise<WeeklyDealWithProduct[]> {
    const deals = await db
      .select()
      .from(weeklyDeals)
      .where(eq(weeklyDeals.isActive, true))
      .orderBy(weeklyDeals.displayOrder);

    const dealsWithProducts = await Promise.all(
      deals.map(async (deal) => {
        const product = await this.getProductWithStore(deal.productId);
        return {
          ...deal,
          product: product!,
        };
      })
    );

    return dealsWithProducts.filter(d => d.product !== undefined);
  }

  async createWeeklyDeal(deal: InsertWeeklyDeal): Promise<WeeklyDeal> {
    const [newDeal] = await db.insert(weeklyDeals).values(deal).returning();
    return newDeal;
  }

  async deleteWeeklyDeal(id: number): Promise<boolean> {
    const result = await db.delete(weeklyDeals).where(eq(weeklyDeals.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Campus Activity
  async getCampusActivities(): Promise<CampusActivityWithUser[]> {
    const activities = await db
      .select()
      .from(campusActivity)
      .orderBy(desc(campusActivity.createdAt))
      .limit(20);

    const activitiesWithUsers = await Promise.all(
      activities.map(async (activity) => {
        if (!activity.userId) return activity;
        const user = await this.getUserById(activity.userId);
        return {
          ...activity,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          } : undefined,
        };
      })
    );

    return activitiesWithUsers;
  }

  async createCampusActivity(activity: InsertCampusActivity): Promise<CampusActivity> {
    const [newActivity] = await db.insert(campusActivity).values(activity).returning();
    return newActivity;
  }

  async deleteCampusActivity(id: number): Promise<boolean> {
    const result = await db.delete(campusActivity).where(eq(campusActivity.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAppConfig(key: string): Promise<string | undefined> {
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    return config?.value;
  }

  async setAppConfig(key: string, value: string): Promise<void> {
    const existing = await this.getAppConfig(key);
    if (existing) {
      await db.update(appConfig).set({ value, updatedAt: new Date() }).where(eq(appConfig.key, key));
    } else {
      await db.insert(appConfig).values({ key, value });
    }
  }

  async getActiveInstallmentOrders(): Promise<Order[]> {
    return await db.select().from(orders).where(
      and(
        eq(orders.isInstallment, true),
        lt(orders.installmentsPaid, 4)
      )
    );
  }

  async createSellerReview(review: InsertSellerReview): Promise<SellerReview> {
    const [newReview] = await db.insert(sellerReviews).values(review).returning();
    
    // Update seller rating
    const allReviews = await this.getReviewsBySellerId(review.sellerId);
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / allReviews.length).toString();
    
    await db.update(stores)
      .set({ 
        rating: avgRating,
        reviewCount: allReviews.length
      })
      .where(eq(stores.userId, review.sellerId));

    return newReview;
  }

  async getReviewsBySellerId(sellerId: number): Promise<SellerReview[]> {
    return await db.select().from(sellerReviews).where(eq(sellerReviews.sellerId, sellerId)).orderBy(desc(sellerReviews.createdAt));
  }
}

export const storage = new DatabaseStorage();