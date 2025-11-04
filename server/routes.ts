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

  // Password Reset routes
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Only allow password reset for admin account
      if (email !== 'richard.jil@outlook.com') {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now

      await storage.setPasswordResetToken(email, resetToken, expiry);

      // Send email with reset link
      const { sendPasswordResetEmail } = await import('./resend');
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      const emailSent = await sendPasswordResetEmail(email, resetToken, resetUrl);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const success = await storage.resetPassword(token, newPassword);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ message: "Token is required", valid: false });
      }

      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.json({ message: "Invalid or expired token", valid: false });
      }

      res.json({ message: "Token is valid", valid: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify token", valid: false });
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

  // Get featured stores
  app.get('/api/stores/featured', async (req, res) => {
    try {
      const { userUniversity, userCity, userCampus } = req.query;
      const filters = {
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      const featuredStores = await storage.getFeaturedStores(filters);
      res.json(featuredStores);
    } catch (error) {
      console.error('Error fetching featured stores:', error);
      res.status(500).json({ message: 'Failed to fetch featured stores', error: String(error) });
    }
  });

  app.get("/api/stores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const store = await storage.getStoreById(id);

      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      // Get user data for the store
      const user = await storage.getUserById(store.userId);
      const storeWithUser = { ...store, user };

      res.json(storeWithUser);
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
  // Get all categories
  app.get('/api/categories', async (req, res) => {
    try {
      const allCategories = await storage.getAllCategories();
      res.json(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories', error: String(error) });
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

  // Get featured products
  app.get('/api/products/featured', async (req, res) => {
    try {
      const { userUniversity, userCity, userCampus } = req.query;
      const filters = {
        userUniversity: userUniversity as string,
        userCity: userCity as string,
        userCampus: userCampus as string,
      };
      const featuredProducts = await storage.getFeaturedProducts(filters);
      res.json(featuredProducts);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).json({ message: 'Failed to fetch featured products', error: String(error) });
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

  // Admin routes for product approval
  app.get("/api/admin/products/pending", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserById(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingProducts = await storage.getPendingProducts();
      res.json(pendingProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending products" });
    }
  });

  app.get("/api/admin/products", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserById(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allProducts = await storage.getAllProductsForAdmin();
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all products" });
    }
  });

  app.put("/api/admin/products/:id/approval", async (req, res) => {
    try {
      const userId = parseInt(req.body.userId);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserById(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid approval status" });
      }

      const product = await storage.updateProductApprovalStatus(productId, status);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product approval status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}