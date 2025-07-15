import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertStoreSchema, insertProductSchema, 
  insertOrderSchema, insertMessageSchema, insertCartItemSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email, username, or phone already exists
      if (userData.email) {
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      if (userData.phoneNumber) {
        const existingPhone = await storage.getUserByPhone(userData.phoneNumber);
        if (existingPhone) {
          return res.status(400).json({ message: "Phone number already exists" });
        }
      }
      
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, username, password, phoneNumber, otpCode } = req.body;
      
      let user = null;
      
      if (email && password) {
        // Email/password login
        user = await storage.verifyPassword(email, password);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      } else if (phoneNumber && otpCode) {
        // Phone/OTP login
        const isValidOtp = await storage.verifyOtp(phoneNumber, otpCode);
        if (!isValidOtp) {
          return res.status(401).json({ message: "Invalid or expired OTP code" });
        }
        
        user = await storage.getUserByPhone(phoneNumber);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        
        await storage.markPhoneAsVerified(phoneNumber);
      } else if (email) {
        // Legacy email-only login (for backward compatibility)
        user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
      } else if (username) {
        // Legacy username-only login (for backward compatibility)
        user = await storage.getUserByUsername(username);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const otpCode = await storage.generateOtp(phoneNumber);
      
      // In a real application, you would send this OTP via SMS
      // For demo purposes, we'll log it to console
      console.log(`OTP for ${phoneNumber}: ${otpCode}`);
      
      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      const user = await storage.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Store routes
  app.post("/api/stores", async (req, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(storeData);
      res.json(store);
    } catch (error) {
      res.status(400).json({ message: "Invalid store data" });
    }
  });

  app.get("/api/stores", async (req, res) => {
    try {
      const { userUniversity, userCity, userCampus } = req.query;
      const filters = {
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      const stores = await storage.getStoresWithUser(filters);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/featured", async (req, res) => {
    try {
      const { userUniversity, userCity, userCampus } = req.query;
      const filters = {
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      const stores = await storage.getFeaturedStores(filters);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured stores" });
    }
  });

  app.get("/api/stores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const store = await storage.getStoreById(id);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.get("/api/stores/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stores = await storage.getStoresByUserId(userId);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stores" });
    }
  });

  app.put("/api/stores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const storeData = req.body;
      
      const store = await storage.updateStore(id, storeData);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Product routes
  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, search, limit, userUniversity, userCity, userCampus } = req.query;
      const filters = {
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      
      const products = await storage.getProductsWithStore(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const { userUniversity, userCity, userCampus } = req.query;
      const filters = {
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      const products = await storage.getFeaturedProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductWithStore(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Increment view count (handled directly in storage)
      const currentProduct = await storage.getProductById(id);
      if (currentProduct) {
        // Direct update in storage to handle viewCount which isn't in the update schema
        (currentProduct as any).viewCount = (currentProduct.viewCount || 0) + 1;
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get("/api/products/store/:storeId", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const products = await storage.getProductsByStoreId(storeId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store products" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = req.body;
      
      const product = await storage.updateProduct(id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Cart routes
  app.post("/api/cart", async (req, res) => {
    try {
      const cartData = insertCartItemSchema.parse(req.body);
      const cartItem = await storage.addToCart(cartData);
      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid cart data" });
    }
  });

  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cartItems = await storage.getCartByUserId(userId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      
      const cartItem = await storage.updateCartItemQuantity(id, quantity);
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.removeFromCart(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  app.delete("/api/cart/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.get("/api/orders/buyer/:buyerId", async (req, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const orders = await storage.getOrdersByBuyerId(buyerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyer orders" });
    }
  });

  app.get("/api/orders/seller/:sellerId", async (req, res) => {
    try {
      const sellerId = parseInt(req.params.sellerId);
      const orders = await storage.getOrdersBySellerId(sellerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller orders" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.get("/api/messages/:user1Id/:user2Id", async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      
      const messages = await storage.getMessagesBetweenUsers(user1Id, user2Id, productId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/unread/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.put("/api/messages/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const marked = await storage.markMessageAsRead(id);
      
      if (!marked) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ message: "Message marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
