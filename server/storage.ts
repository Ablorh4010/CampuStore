import { 
  users, stores, categories, products, orders, messages, cartItems,
  type User, type InsertUser, type Store, type InsertStore, 
  type Category, type Product, type InsertProduct, type Order, type InsertOrder,
  type Message, type InsertMessage, type CartItem, type InsertCartItem,
  type ProductWithStore, type StoreWithUser, type OrderWithDetails, type CartItemWithProduct
} from "@shared/schema";

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
  getStoresWithUser(): Promise<StoreWithUser[]>;
  getFeaturedStores(): Promise<StoreWithUser[]>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductWithStore(id: number): Promise<ProductWithStore | undefined>;
  getProductsByStoreId(storeId: number): Promise<Product[]>;
  getProductsWithStore(filters?: { categoryId?: number; search?: string; limit?: number }): Promise<ProductWithStore[]>;
  getFeaturedProducts(): Promise<ProductWithStore[]>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private stores: Map<number, Store> = new Map();
  private categories: Map<number, Category> = new Map();
  private products: Map<number, Product> = new Map();
  private orders: Map<number, Order> = new Map();
  private messages: Map<number, Message> = new Map();
  private cartItems: Map<number, CartItem> = new Map();
  
  private currentUserId = 1;
  private currentStoreId = 1;
  private currentCategoryId = 1;
  private currentProductId = 1;
  private currentOrderId = 1;
  private currentMessageId = 1;
  private currentCartItemId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize categories
    const categoryData = [
      { name: "Textbooks", icon: "fas fa-book", color: "blue-100" },
      { name: "Electronics", icon: "fas fa-laptop", color: "yellow-100" },
      { name: "Clothing", icon: "fas fa-tshirt", color: "pink-100" },
      { name: "Furniture", icon: "fas fa-couch", color: "green-100" },
      { name: "Sports", icon: "fas fa-basketball-ball", color: "red-100" },
      { name: "Supplies", icon: "fas fa-pen", color: "purple-100" }
    ];

    categoryData.forEach(cat => {
      const category: Category = {
        id: this.currentCategoryId++,
        name: cat.name,
        icon: cat.icon,
        color: cat.color
      };
      this.categories.set(category.id, category);
    });
  }

  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      isMerchant: insertUser.isMerchant || false,
      avatar: insertUser.avatar || null,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Stores
  async createStore(insertStore: InsertStore): Promise<Store> {
    const store: Store = {
      ...insertStore,
      id: this.currentStoreId++,
      rating: "0",
      reviewCount: 0,
      isActive: insertStore.isActive !== undefined ? insertStore.isActive : true,
      createdAt: new Date()
    };
    this.stores.set(store.id, store);
    
    // Update user to merchant
    const user = this.users.get(store.userId);
    if (user) {
      this.users.set(user.id, { ...user, isMerchant: true });
    }
    
    return store;
  }

  async getStoreById(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStoresByUserId(userId: number): Promise<Store[]> {
    return Array.from(this.stores.values()).filter(store => store.userId === userId);
  }

  async getStoresWithUser(): Promise<StoreWithUser[]> {
    const storesWithUser: StoreWithUser[] = [];
    
    for (const store of this.stores.values()) {
      const user = this.users.get(store.userId);
      if (user) {
        const productCount = Array.from(this.products.values())
          .filter(product => product.storeId === store.id).length;
        
        storesWithUser.push({
          ...store,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
          },
          productCount
        });
      }
    }
    
    return storesWithUser;
  }

  async getFeaturedStores(): Promise<StoreWithUser[]> {
    const stores = await this.getStoresWithUser();
    return stores.slice(0, 6);
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    
    const updatedStore = { ...store, ...data };
    this.stores.set(id, updatedStore);
    return updatedStore;
  }

  // Categories
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  // Products
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const product: Product = {
      ...insertProduct,
      id: this.currentProductId++,
      originalPrice: insertProduct.originalPrice || null,
      isAvailable: insertProduct.isAvailable !== undefined ? insertProduct.isAvailable : true,
      viewCount: 0,
      createdAt: new Date()
    };
    this.products.set(product.id, product);
    return product;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductWithStore(id: number): Promise<ProductWithStore | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const store = this.stores.get(product.storeId);
    if (!store) return undefined;

    const user = this.users.get(store.userId);
    if (!user) return undefined;

    const category = this.categories.get(product.categoryId);
    if (!category) return undefined;

    return {
      ...product,
      store: {
        ...store,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
      },
      category
    };
  }

  async getProductsByStoreId(storeId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.storeId === storeId);
  }

  async getProductsWithStore(filters?: { categoryId?: number; search?: string; limit?: number }): Promise<ProductWithStore[]> {
    const productsWithStore: ProductWithStore[] = [];
    
    for (const product of this.products.values()) {
      if (!product.isAvailable) continue;
      
      if (filters?.categoryId && product.categoryId !== filters.categoryId) continue;
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        if (!product.title.toLowerCase().includes(searchLower) && 
            !product.description.toLowerCase().includes(searchLower)) {
          continue;
        }
      }

      const store = this.stores.get(product.storeId);
      if (!store) continue;

      const user = this.users.get(store.userId);
      if (!user) continue;

      const category = this.categories.get(product.categoryId);
      if (!category) continue;

      productsWithStore.push({
        ...product,
        store: {
          ...store,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
          }
        },
        category
      });
    }
    
    const sorted = productsWithStore.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  }

  async getFeaturedProducts(): Promise<ProductWithStore[]> {
    return this.getProductsWithStore({ limit: 8 });
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...data };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Orders
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const order: Order = {
      ...insertOrder,
      id: this.currentOrderId++,
      status: insertOrder.status || "pending",
      quantity: insertOrder.quantity || 1,
      createdAt: new Date()
    };
    this.orders.set(order.id, order);
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByBuyerId(buyerId: number): Promise<OrderWithDetails[]> {
    const orders: OrderWithDetails[] = [];
    
    for (const order of this.orders.values()) {
      if (order.buyerId !== buyerId) continue;
      
      const product = this.products.get(order.productId);
      const buyer = this.users.get(order.buyerId);
      const seller = this.users.get(order.sellerId);
      
      if (product && buyer && seller) {
        orders.push({
          ...order,
          product,
          buyer: { firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email },
          seller: { firstName: seller.firstName, lastName: seller.lastName, email: seller.email }
        });
      }
    }
    
    return orders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getOrdersBySellerId(sellerId: number): Promise<OrderWithDetails[]> {
    const orders: OrderWithDetails[] = [];
    
    for (const order of this.orders.values()) {
      if (order.sellerId !== sellerId) continue;
      
      const product = this.products.get(order.productId);
      const buyer = this.users.get(order.buyerId);
      const seller = this.users.get(order.sellerId);
      
      if (product && buyer && seller) {
        orders.push({
          ...order,
          product,
          buyer: { firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email },
          seller: { firstName: seller.firstName, lastName: seller.lastName, email: seller.email }
        });
      }
    }
    
    return orders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      productId: insertMessage.productId || null,
      isRead: false,
      createdAt: new Date()
    };
    this.messages.set(message.id, message);
    return message;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number, productId?: number): Promise<Message[]> {
    const messages = Array.from(this.messages.values()).filter(message => {
      const isParticipant = (message.fromId === user1Id && message.toId === user2Id) ||
                           (message.fromId === user2Id && message.toId === user1Id);
      
      if (productId) {
        return isParticipant && message.productId === productId;
      }
      
      return isParticipant;
    });
    
    return messages.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messages.values())
      .filter(message => message.toId === userId && !message.isRead).length;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    this.messages.set(id, { ...message, isRead: true });
    return true;
  }

  // Cart
  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const existingItem = Array.from(this.cartItems.values())
      .find(item => item.userId === insertCartItem.userId && item.productId === insertCartItem.productId);
    
    if (existingItem) {
      const currentQty = existingItem.quantity || 0;
      const addQty = insertCartItem.quantity || 1;
      const updatedItem = { ...existingItem, quantity: currentQty + addQty };
      this.cartItems.set(existingItem.id, updatedItem);
      return updatedItem;
    }

    const cartItem: CartItem = {
      ...insertCartItem,
      id: this.currentCartItemId++,
      quantity: insertCartItem.quantity || 1,
      createdAt: new Date()
    };
    this.cartItems.set(cartItem.id, cartItem);
    return cartItem;
  }

  async getCartByUserId(userId: number): Promise<CartItemWithProduct[]> {
    const cartItemsWithProduct: CartItemWithProduct[] = [];
    
    for (const cartItem of this.cartItems.values()) {
      if (cartItem.userId !== userId) continue;
      
      const productWithStore = await this.getProductWithStore(cartItem.productId);
      if (productWithStore) {
        cartItemsWithProduct.push({
          ...cartItem,
          product: productWithStore
        });
      }
    }
    
    return cartItemsWithProduct;
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem) return undefined;
    
    if (quantity <= 0) {
      this.cartItems.delete(id);
      return undefined;
    }
    
    const updatedItem = { ...cartItem, quantity };
    this.cartItems.set(id, updatedItem);
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId: number): Promise<boolean> {
    const userCartItems = Array.from(this.cartItems.entries())
      .filter(([, item]) => item.userId === userId);
    
    userCartItems.forEach(([id]) => this.cartItems.delete(id));
    return true;
  }
}

export const storage = new MemStorage();
