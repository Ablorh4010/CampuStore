import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, insertStoreSchema, insertProductSchema, 
  insertOrderSchema, insertMessageSchema, insertCartItemSchema,
  users, orders
} from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { generateToken, authenticateToken, requireAdmin, type AuthRequest } from "./auth";
import path from "path";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({ dest: 'uploads/' });

// Configure multer for image uploads with validation
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Auth routes with rate limiting
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { otpCode, ...userData } = req.body;
      const parsedUserData = insertUserSchema.parse(userData);

      // Verify OTP for email-based registration
      if (!otpCode) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const isValidOtp = await storage.verifyOtp(parsedUserData.email, otpCode);
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid or expired verification code" });
      }

      // Check if email or username already exists
      const existingEmail = await storage.getUserByEmail(parsedUserData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(parsedUserData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(parsedUserData);
      
      // Mark email as verified since we just verified the OTP
      await storage.markEmailAsVerified(parsedUserData.email);
      
      // Generate JWT token
      const token = generateToken(user.id);
      
      res.json({ 
        user: { ...user, password: undefined },
        token 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Admin Registration - Token-protected, Email/Password based
  app.post("/api/auth/admin/register", authLimiter, async (req, res) => {
    try {
      const { email, password, username, firstName, lastName, inviteToken } = req.body;

      // Validate required fields
      if (!email || !password || !username || !firstName || !lastName || !inviteToken) {
        return res.status(400).json({ message: "All fields including invite token are required" });
      }

      // Verify invite token (secure constant for admin access)
      // Token: CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1
      const ADMIN_INVITE_TOKEN = 'CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1';
      if (inviteToken !== ADMIN_INVITE_TOKEN) {
        return res.status(403).json({ message: "Invalid invite token. Admin registration requires a valid invitation." });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin user directly in database with isAdmin flag
      const [adminUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        username,
        firstName,
        lastName,
        university: 'Admin',
        city: 'Admin',
        isAdmin: true,
        isMerchant: false,
        userType: 'admin',
      }).returning();

      // Generate JWT token
      const token = generateToken(adminUser.id);

      res.json({
        user: { ...adminUser, password: undefined },
        token
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      res.status(400).json({ message: "Failed to create admin account" });
    }
  });

  // Seller Registration - WhatsApp OTP based
  app.post("/api/auth/seller/register", authLimiter, async (req, res) => {
    try {
      const { whatsappOtpCode, ...userData } = req.body;
      
      // Validate WhatsApp OTP
      if (!whatsappOtpCode || !userData.whatsappNumber) {
        return res.status(400).json({ message: "WhatsApp verification code is required for seller registration" });
      }

      const isValidOtp = await storage.verifyWhatsappOtp(userData.whatsappNumber, whatsappOtpCode);
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid or expired WhatsApp verification code" });
      }

      // Check if whatsapp number already exists
      const existingWhatsapp = await storage.getUserByWhatsapp(userData.whatsappNumber);
      if (existingWhatsapp) {
        return res.status(400).json({ message: "WhatsApp number already registered" });
      }

      // Check if email or username already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create seller user with userType set to seller
      const sellerData = {
        ...userData,
        userType: 'seller',
        isMerchant: true,
      };
      
      const parsedUserData = insertUserSchema.parse(sellerData);
      const user = await storage.createUser(parsedUserData);
      
      // Mark WhatsApp as verified since we just verified the OTP
      await storage.markWhatsappAsVerified(userData.whatsappNumber);
      
      // Generate JWT token
      const token = generateToken(user.id);
      
      res.json({ 
        user: { ...user, password: undefined },
        token 
      });
    } catch (error) {
      console.error('Seller registration error:', error);
      res.status(400).json({ message: "Invalid seller data" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password, otpCode, whatsappNumber, whatsappOtpCode } = req.body;

      let user = null;

      if (email && password) {
        // Email/password login (admin only)
        user = await storage.verifyPassword(email, password);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      } else if (whatsappNumber && whatsappOtpCode) {
        // WhatsApp/OTP login (sellers)
        const isValidOtp = await storage.verifyWhatsappOtp(whatsappNumber, whatsappOtpCode);
        if (!isValidOtp) {
          return res.status(401).json({ message: "Invalid or expired WhatsApp OTP code" });
        }

        user = await storage.getUserByWhatsapp(whatsappNumber);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        await storage.markWhatsappAsVerified(whatsappNumber);
      } else if (email && otpCode) {
        // Email/OTP login (buyers - optional)
        const isValidOtp = await storage.verifyOtp(email, otpCode);
        if (!isValidOtp) {
          return res.status(401).json({ message: "Invalid or expired OTP code" });
        }

        user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        await storage.markEmailAsVerified(email);
      } else {
        // No valid credentials provided
        return res.status(400).json({ message: "Valid credentials required (email/password, email/OTP, or WhatsApp/OTP)" });
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      res.json({ 
        user: { ...user, password: undefined },
        token 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/send-otp", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const otpCode = await storage.generateOtp(email);
      
      // Import email service
      const { sendVerificationEmail } = await import('./email');
      await sendVerificationEmail(email, otpCode);

      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Send WhatsApp OTP for sellers
  app.post("/api/auth/send-whatsapp-otp", authLimiter, async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const otpCode = await storage.generateWhatsappOtp(phoneNumber);
      
      // Import WhatsApp service
      const { sendWhatsAppOtp } = await import('./whatsapp');
      const sent = await sendWhatsAppOtp(phoneNumber, otpCode);

      if (!sent) {
        return res.status(500).json({ message: "Failed to send WhatsApp verification code" });
      }

      res.json({ message: "Verification code sent to your WhatsApp" });
    } catch (error) {
      console.error('Send WhatsApp OTP error:', error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Password Reset routes
  app.post("/api/auth/request-password-reset", authLimiter, async (req, res) => {
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

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
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

  app.put("/api/users/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure user can only update their own profile
      if (req.userId !== id) {
        return res.status(403).json({ message: "Cannot update another user's profile" });
      }

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
  app.post("/api/stores", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      
      // Ensure userId in store data matches authenticated user
      if (storeData.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot create store for another user" });
      }

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

  app.put("/api/stores/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify user owns the store
      const existingStore = await storage.getStoreById(id);
      if (!existingStore) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      if (existingStore.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot update another user's store" });
      }

      const storeData = req.body;
      const store = await storage.updateStore(id, storeData);

      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  // Image upload endpoint (for sellers only)
  app.post("/api/upload/images", authenticateToken, imageUpload.array('images', 5), async (req: AuthRequest, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
      res.json({ urls: imageUrls });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to upload images'
      });
    }
  });

  // Verification document upload (ID and face scan)
  app.post("/api/upload/verification", authenticateToken, imageUpload.fields([
    { name: 'idScan', maxCount: 1 },
    { name: 'faceScan', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || (!files.idScan && !files.faceScan)) {
        return res.status(400).json({ message: "No verification documents uploaded" });
      }

      const idScanUrl = files.idScan ? `/uploads/${files.idScan[0].filename}` : undefined;
      const faceScanUrl = files.faceScan ? `/uploads/${files.faceScan[0].filename}` : undefined;

      // Update user verification status to pending (for sellers)
      await storage.updateUser(req.userId!, {
        idScanUrl,
        faceScanUrl,
        verificationStatus: 'pending'
      });

      res.json({ 
        idScanUrl, 
        faceScanUrl,
        message: "Verification documents uploaded successfully. Pending admin review." 
      });
    } catch (error) {
      console.error('Verification upload error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to upload verification documents'
      });
    }
  });

  // Upload buyer verification for checkout
  app.post("/api/upload/buyer-verification", authenticateToken, imageUpload.fields([
    { name: 'buyerIdScan', maxCount: 1 },
    { name: 'buyerFaceScan', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || (!files.buyerIdScan && !files.buyerFaceScan)) {
        return res.status(400).json({ message: "No verification documents uploaded" });
      }

      const buyerIdScanUrl = files.buyerIdScan ? `/uploads/${files.buyerIdScan[0].filename}` : undefined;
      const buyerFaceScanUrl = files.buyerFaceScan ? `/uploads/${files.buyerFaceScan[0].filename}` : undefined;

      // Update buyer verification documents
      await storage.updateUser(req.userId!, {
        buyerIdScanUrl,
        buyerFaceScanUrl,
        buyerVerifiedAt: new Date()
      });

      res.json({ 
        buyerIdScanUrl, 
        buyerFaceScanUrl,
        message: "Buyer verification documents uploaded successfully." 
      });
    } catch (error) {
      console.error('Buyer verification upload error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to upload buyer verification documents'
      });
    }
  });

  // Update user payment details
  app.put("/api/users/payment-details", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const paymentData = req.body;
      
      // Validate payment method
      const validMethods = ['bank', 'paypal', 'mobile_money'];
      if (paymentData.paymentMethod && !validMethods.includes(paymentData.paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }

      // Update user with payment details
      const updatedUser = await storage.updateUser(req.userId!, {
        paymentMethod: paymentData.paymentMethod,
        bankAccountNumber: paymentData.bankAccountNumber,
        bankName: paymentData.bankName,
        accountHolderName: paymentData.accountHolderName,
        paypalUserId: paymentData.paypalUserId,
        mobileMoneyProvider: paymentData.mobileMoneyProvider,
        mobileMoneyPhone: paymentData.mobileMoneyPhone,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Payment details updated successfully", user: updatedUser });
    } catch (error) {
      console.error('Payment details update error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update payment details'
      });
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
  app.post("/api/products", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      
      // Verify user owns the store
      const store = await storage.getStoreById(productData.storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      if (store.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot create product for another user's store" });
      }

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

  app.put("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify user owns the product's store
      const existingProduct = await storage.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const store = await storage.getStoreById(existingProduct.storeId);
      if (!store || store.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot update another user's product" });
      }

      const productData = req.body;
      const product = await storage.updateProduct(id, productData);

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify user owns the product's store
      const existingProduct = await storage.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const store = await storage.getStoreById(existingProduct.storeId);
      if (!store || store.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot delete another user's product" });
      }

      const deleted = await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Cart routes
  app.post("/api/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cartData = insertCartItemSchema.parse(req.body);
      
      // Ensure userId matches authenticated user
      if (cartData.userId !== req.userId) {
        return res.status(403).json({ message: "Cannot add to another user's cart" });
      }

      const cartItem = await storage.addToCart(cartData);
      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid cart data" });
    }
  });

  app.get("/api/cart/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure user can only access their own cart
      if (userId !== req.userId) {
        return res.status(403).json({ message: "Cannot access another user's cart" });
      }

      const cartItems = await storage.getCartByUserId(userId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.put("/api/cart/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;

      const cartItem = await storage.updateCartItemQuantity(id, quantity);
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, async (req: AuthRequest, res) => {
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

  app.delete("/api/cart/user/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure user can only clear their own cart
      if (userId !== req.userId) {
        return res.status(403).json({ message: "Cannot clear another user's cart" });
      }

      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Order routes
  app.post("/api/orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      
      // Ensure buyerId matches authenticated user
      if (orderData.buyerId !== req.userId) {
        return res.status(403).json({ message: "Cannot create order for another user" });
      }

      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.get("/api/orders/buyer/:buyerId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      
      // Ensure user can only access their own orders
      if (buyerId !== req.userId) {
        return res.status(403).json({ message: "Cannot access another user's orders" });
      }

      const orders = await storage.getOrdersByBuyerId(buyerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyer orders" });
    }
  });

  app.get("/api/orders/seller/:sellerId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const sellerId = parseInt(req.params.sellerId);
      
      // Ensure user can only access their own seller orders
      if (sellerId !== req.userId) {
        return res.status(403).json({ message: "Cannot access another user's orders" });
      }

      const orders = await storage.getOrdersBySellerId(sellerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller orders" });
    }
  });

  app.put("/api/orders/:id/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Verify user is either buyer or seller of the order
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
        return res.status(403).json({ message: "Cannot update another user's order" });
      }

      const updatedOrder = await storage.updateOrderStatus(id, status);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Buyer confirms product received or rejected
  app.put("/api/orders/:id/buyer-confirmation", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmation } = req.body; // 'received' or 'rejected'
      
      if (!['received', 'rejected'].includes(confirmation)) {
        return res.status(400).json({ message: "Invalid confirmation type. Must be 'received' or 'rejected'" });
      }

      // Verify user is the buyer
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.buyerId !== req.userId) {
        return res.status(403).json({ message: "Only the buyer can confirm order delivery" });
      }

      // Update order with buyer confirmation
      await db.update(orders).set({
        buyerConfirmation: confirmation,
        buyerConfirmationAt: new Date(),
        deliveryStatus: confirmation === 'received' ? 'delivered' : 'rejected',
        payoutStatus: confirmation === 'received' ? 'pending' : 'cancelled',
        status: confirmation === 'received' ? 'completed' : 'rejected'
      }).where(eq(orders.id, id));

      const updatedOrder = await storage.getOrderById(id);
      
      res.json({ 
        ...updatedOrder,
        message: confirmation === 'received' 
          ? "Product marked as received. Seller payout is now pending." 
          : "Product marked as rejected. Order has been cancelled."
      });
    } catch (error) {
      console.error('Buyer confirmation error:', error);
      res.status(500).json({ message: "Failed to confirm order" });
    }
  }); {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Message routes
  app.post("/api/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Ensure fromId matches authenticated user
      if (messageData.fromId !== req.userId) {
        return res.status(403).json({ message: "Cannot send message as another user" });
      }

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.get("/api/messages/:user1Id/:user2Id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      // Ensure authenticated user is one of the participants
      if (req.userId !== user1Id && req.userId !== user2Id) {
        return res.status(403).json({ message: "Cannot access other users' messages" });
      }

      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const messages = await storage.getMessagesBetweenUsers(user1Id, user2Id, productId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/unread/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure user can only check their own unread messages
      if (userId !== req.userId) {
        return res.status(403).json({ message: "Cannot access another user's messages" });
      }

      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.put("/api/messages/:id/read", authenticateToken, async (req: AuthRequest, res) => {
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
  app.get("/api/admin/products/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const pendingProducts = await storage.getPendingProducts();
      res.json(pendingProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending products" });
    }
  });

  app.get("/api/admin/products", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allProducts = await storage.getAllProductsForAdmin();
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all products" });
    }
  });

  app.put("/api/admin/products/:id/approval", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
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

  app.post("/api/admin/products", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { storeId, categoryId, title, description, price, originalPrice, condition, images, specialOffer } = req.body;

      // Validate required fields
      if (!storeId || !categoryId || !title || !description || !price || !condition || !images || images.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify store exists
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      // Create product (will be created with 'pending' status by default)
      const newProduct = await storage.createProduct({
        storeId,
        categoryId,
        title,
        description,
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        condition,
        images,
        specialOffer: specialOffer || null,
      });

      // Immediately approve the product since admin created it
      const product = await storage.updateProductApprovalStatus(newProduct.id, 'approved');

      res.json(product);
    } catch (error) {
      console.error('Admin product creation error:', error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.post("/api/admin/products/import", authenticateToken, requireAdmin, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const storeId = parseInt(req.body.storeId);
      if (!storeId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store exists
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      let products = [];
      const errors: string[] = [];

      // CSV import with robust parsing
      if (req.file) {
        try {
          const csvContent = readFileSync(req.file.path, 'utf-8');
          
          // Parse CSV with proper handling of quoted fields and commas
          const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
          });

          for (let i = 0; i < records.length; i++) {
            const row = records[i] as any;
            
            try {
              // Validate required fields
              if (!row.title || !row.description || !row.price) {
                errors.push(`Row ${i + 2}: Missing required fields (title, description, or price)`);
                continue;
              }

              const parsedCategoryId = row.categoryId ? parseInt(String(row.categoryId)) : 1;
              
              const product = {
                storeId,
                title: String(row.title).trim(),
                description: String(row.description).trim(),
                price: String(row.price).trim(),
                originalPrice: row.originalPrice ? String(row.originalPrice).trim() : null,
                condition: row.condition ? String(row.condition).trim() : 'new',
                categoryId: parsedCategoryId,
                images: row.images ? String(row.images).split('|').map(img => img.trim()).filter(Boolean) : [],
              };

              // Validate numeric fields
              const priceNum = parseFloat(product.price);
              if (!Number.isFinite(priceNum) || priceNum < 0) {
                errors.push(`Row ${i + 2}: Invalid price value "${row.price}" (must be a positive number)`);
                continue;
              }

              if (!Number.isFinite(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 6) {
                errors.push(`Row ${i + 2}: Invalid categoryId "${row.categoryId}" (must be a number between 1-6)`);
                continue;
              }

              products.push(product);
            } catch (rowError) {
              errors.push(`Row ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
            }
          }
        } catch (csvError) {
          return res.status(400).json({ 
            message: `CSV parsing error: ${csvError instanceof Error ? csvError.message : 'Invalid CSV format'}` 
          });
        }
      }
      // URL import
      else if (req.body.url) {
        const { url, platform, apiKey } = req.body;
        
        try {
          let response;
          if (platform === 'shopify') {
            const shopUrl = new URL(url);
            const apiUrl = `${shopUrl.origin}/admin/api/2024-01/products.json`;
            response = await fetch(apiUrl, {
              headers: apiKey ? { 'X-Shopify-Access-Token': apiKey } : {},
            });
          } else if (platform === 'woocommerce') {
            const wcUrl = new URL(url);
            const apiUrl = `${wcUrl.origin}/wp-json/wc/v3/products`;
            response = await fetch(apiUrl, {
              headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
            });
          } else {
            response = await fetch(url);
          }

          if (!response.ok) {
            throw new Error(`Failed to fetch from ${platform}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (platform === 'shopify' && data.products) {
            products = data.products.map((p: any) => ({
              storeId,
              title: p.title,
              description: p.body_html || p.title,
              price: p.variants?.[0]?.price || '0',
              originalPrice: p.variants?.[0]?.compare_at_price || null,
              condition: 'new',
              categoryId: 1,
              images: p.images?.map((img: any) => img.src) || [],
            }));
          } else if (platform === 'woocommerce' && Array.isArray(data)) {
            products = data.map((p: any) => ({
              storeId,
              title: p.name,
              description: p.description || p.name,
              price: p.price,
              originalPrice: p.regular_price !== p.price ? p.regular_price : null,
              condition: 'new',
              categoryId: 1,
              images: p.images?.map((img: any) => img.src) || [],
            }));
          } else {
            return res.status(400).json({ message: "Unsupported data format from URL" });
          }
        } catch (error) {
          return res.status(500).json({ message: `Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      } else {
        return res.status(400).json({ message: "Either file or URL is required" });
      }

      // Bulk create products
      if (products.length === 0) {
        return res.status(400).json({ 
          message: "No valid products to import",
          errors,
          count: 0
        });
      }

      const createdProducts = await storage.bulkCreateProducts(products);

      res.json({ 
        count: createdProducts.length,
        products: createdProducts,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 
          ? `Imported ${createdProducts.length} products with ${errors.length} errors`
          : `Successfully imported ${createdProducts.length} products`
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ message: `Failed to import products: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Stripe payment intent route
  app.post("/api/create-payment-intent", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { amount, cartItems } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: req.user!.id.toString(),
          cartItems: JSON.stringify(cartItems || []),
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}