import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, insertStoreSchema, insertProductSchema, 
  insertOrderSchema, insertMessageSchema, insertCartItemSchema,
  insertWeeklyDealSchema, insertCampusActivitySchema,
  users, orders
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import crypto from 'crypto';
import { generateToken, authenticateToken, tryAuthenticate, requireAdmin, type AuthRequest } from "./auth";
import { sendOrderConfirmation } from "./notifications";
import path from "path";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { Resend } from 'resend';
import sharp from 'sharp';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('Warning: RESEND_API_KEY is missing. Email skipped:', { to, subject });
    return false;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: 'The University Hub <support@uniexchangehub.com>',
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error('❌ Resend API Error (sendEmail):', error);
      return false;
    }
    
    console.log(`✅ Email sent to ${to}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });
} else {
  console.warn('Warning: STRIPE_SECRET_KEY is missing. Payment features will be disabled.');
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Allow 20 attempts per 10 mins
  message: 'Too many authentication attempts, please try again in 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
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

const inMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

async function createPaystackPlan(amount: number, name: string) {
  try {
    const response = await fetch('https://api.paystack.co/plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        amount: Math.round(amount * 100),
        interval: 'monthly',
        currency: 'GHS',
        invoice_limit: 3, // 3 remaining installments
        description: 'Bɔkɔɔ Pay Installment Plan'
      })
    });
    const data = await response.json();
    return data.status ? data.data.plan_code : null;
  } catch (error) {
    console.error('Error creating Paystack plan:', error);
    return null;
  }
}

async function finalizePaystackOrder(data: any) {
  const { reference, metadata, customer } = data;
  
  // Check if orders already exist for this reference to avoid duplicates
  const existingOrders = await storage.getOrdersByReference(reference);
  if (existingOrders.length > 0) {
    console.log(`Orders already exist for reference ${reference}, skipping creation.`);
    return existingOrders;
  }

  const cartItems = metadata.cartItems;
  const userId = metadata.userId ? parseInt(metadata.userId) : null;
  const guestDetails = metadata.guestDetails;
  const codFee = metadata.codFee;

  const createdOrders = [];
  const buyerInfo = userId ? await storage.getUserById(userId) : null;
  const buyerEmail = guestDetails?.email || customer.email || buyerInfo?.email;
  const buyerName = buyerInfo ? `${buyerInfo.firstName} ${buyerInfo.lastName}` : (guestDetails ? `${guestDetails.firstName} ${guestDetails.lastName}` : "Customer");

  for (const item of cartItems) {
    const product = await storage.getProductById(item.productId);
    if (!product) continue;
    const store = await storage.getStoreById(product.storeId);
    if (!store) continue;

    const isThisItemEligible = product.isInstallmentEligible && metadata.isBokoo;
    const itemRecurringAmount = isThisItemEligible ? (parseFloat(product.price.toString()) * item.quantity * 0.75) / 3 : 0;

    const order = await storage.createOrder({
      buyerId: userId || 0,
      sellerId: store.userId,
      productId: product.id,
      quantity: item.quantity,
      totalAmount: (parseFloat(product.price.toString()) * item.quantity).toString(),
      codFee: codFee ? codFee.toString() : null,
      status: 'confirmed',
      paymentReference: reference,
      paymentGateway: 'paystack',
      shippingMode: (metadata.shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
      buyerAddress: guestDetails?.address || buyerInfo?.address || 'Provided at checkout',
      buyerEmail: buyerEmail,
      payoutStatus: 'pending',
      
      // Installment info - only applied if the product itself is eligible
      isInstallment: isThisItemEligible,
      installmentsPaid: isThisItemEligible ? 1 : 0,
      installmentAmount: isThisItemEligible ? itemRecurringAmount.toFixed(2) : null,
      nextInstallmentDate: isThisItemEligible ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      paystackAuthCode: data.authorization?.authorization_code || null,
    });
    
    createdOrders.push(order);

    // Send confirmation email
    try {
      const buyerForEmail = buyerInfo || { firstName: buyerName.split(' ')[0], email: buyerEmail };
      await sendOrderConfirmation(order, buyerForEmail, product);
    } catch (emailErr) {
      console.error('Failed to send confirmation email for order:', order.id, emailErr);
    }
  }

  // Clear cart if user is logged in
  if (userId) {
    console.log(`Clearing cart for user ${userId} after successful payment.`);
    await storage.clearCart(userId);
  }

  // Send secondary "Thank You" email with tracking info
  try {
    const { sendPurchaseConfirmationEmail } = await import('./email');
    const trackingUrl = `${process.env.APP_URL || 'https://uniexchangehub.com'}/gh/orders`;
    const buyerNameForEmail = buyerInfo ? `${buyerInfo.firstName} ${buyerInfo.lastName}` : (guestDetails ? `${guestDetails.firstName} ${guestDetails.lastName}` : "Customer");
    
    await sendPurchaseConfirmationEmail(
      buyerEmail,
      buyerNameForEmail,
      createdOrders[0]?.id || 0,
      (metadata.shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
      trackingUrl,
      false, // isCOD is false for Paystack
      createdOrders[0]?.totalAmount || "0"
    );
  } catch (emailErr) {
    console.error('Failed to send secondary purchase confirmation email:', emailErr);
  }

  return createdOrders;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Register extended feature routes (Events, Clubs, Auctions, Study Groups, etc.)
  const { registerFeatureRoutes } = await import('./feature-routes');
  registerFeatureRoutes(app);

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

  // Seller Registration - Email OTP based
  app.post("/api/auth/seller/register", authLimiter, async (req, res) => {
    try {
      const { otpCode, ...userData } = req.body;
      
      // Validate Email OTP
      if (!otpCode || !userData.email) {
        return res.status(400).json({ message: "Verification code is required for seller registration" });
      }

      const isValidOtp = await storage.verifyOtp(userData.email, otpCode);
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid or expired verification code" });
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
      
      // Mark email as verified since we just verified the OTP
      await storage.markEmailAsVerified(userData.email);
      
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

      // Handle login cases
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
        // Email/OTP login (standard user login)
        const isValidOtp = await storage.verifyOtp(email, otpCode);
        if (!isValidOtp) {
          return res.status(401).json({ message: "Invalid or expired verification code" });
        }

        user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ message: "User not found. Please register first." });
        }

        await storage.markEmailAsVerified(email);
      } else if (email && !otpCode && !password) {
        // Just email provided - send them an OTP for login
        const existingUser = await storage.getUserByEmail(email);
        if (!existingUser) {
          return res.status(404).json({ message: "Account not found. Please sign up instead." });
        }
        
        const code = await storage.generateOtp(email);
        const { sendVerificationEmail } = await import('./email');
        const sent = await sendVerificationEmail(email, code);
        
        if (!sent) {
          return res.status(500).json({ message: "Verification service not configured or failed to send" });
        }
        
        return res.json({ message: "Verification code sent for login", otpSent: true });
      } else {
        // No valid credentials provided
        return res.status(400).json({ message: "Please provide your email to receive a verification code" });
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
      const sent = await sendVerificationEmail(email, otpCode);

      if (!sent) {
        return res.status(500).json({ message: "Verification service not configured or failed to send" });
      }

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
      if (!user || !user.isAdmin) {
        // For security, don't reveal if user exists or is admin
        return res.json({ message: "If an admin account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now

      await storage.setPasswordResetToken(email, resetToken, expiry);

      // Send email with reset link
      const { sendPasswordResetEmail } = await import('./email');
      const baseUrl = process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://uniexchangehub.com' : `${req.protocol}://${req.get('host')}`);
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      await sendPasswordResetEmail(email, resetUrl);

      res.json({ message: "If an admin account with that email exists, a password reset link has been sent." });
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

  // AI integrations
  app.post("/api/ai/generate-description", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { title, category } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });

      const { generateProductDescription } = await import('./ai');
      const result = await generateProductDescription(title, category);
      res.json(result);
    } catch (error) {
      console.error("AI Description Error:", error);
      res.status(500).json({ message: "Failed to generate AI description" });
    }
  });
  app.post("/api/ai/generate-store-profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, university, city } = req.body;
      if (!name || !university || !city) {
        return res.status(400).json({ message: "Name, university, and city are required for AI generation" });
      }
      
      const { generateStoreProfile } = await import('./ai');
      const profile = await generateStoreProfile(name, university, city);
      res.json(profile);
    } catch (error) {
      console.error("AI Endpoint Error:", error);
      res.status(500).json({ message: "Failed to generate AI profile" });
    }
  });

  app.post("/api/ai/generate-tracking-insights/:orderId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrderById(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      // Check if user is buyer or seller of this order
      if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
        return res.status(403).json({ message: "Unauthorized access to order" });
      }

      const product = await storage.getProductById(order.productId);
      
      const { generateTrackingInsights } = await import('./ai');
      const insights = await generateTrackingInsights({ ...order, product });
      res.json(insights);
    } catch (error) {
      console.error("AI Tracking Insight Error:", error);
      res.status(500).json({ message: "Failed to generate AI tracking insights" });
    }
  });

  app.post("/api/ai/analyze-image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ message: "Image data is required" });

      const { analyzeProductImage } = await import('./ai');
      const result = await analyzeProductImage(image);
      res.json(result);
    } catch (error) {
      console.error("AI Image Analysis Error:", error);
      res.status(500).json({ message: "Failed to analyze image with AI" });
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

      // storage.createStore already sets approvalStatus to 'waiting_verification'
      const store = await storage.createStore(storeData);
      res.json(store);
    } catch (error) {
      console.error("Store creation validation error:", error);
      res.status(400).json({ 
        message: "Invalid store data", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
  app.put("/api/orders/:id/seller-approval", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approval } = req.body;
      const order = await storage.getOrderById(id);
      
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.sellerId !== req.userId) return res.status(403).json({ message: "Unauthorized" });

      const updatedOrder = await storage.updateOrder(id, { 
        sellerApproval: approval,
        fulfillmentStatus: approval === 'approved' ? 'seller_approved' : 'order_received',
        status: approval === 'rejected' ? 'rejected' : order.status
      });

      // Notify Admin
      const adminUsers = await storage.getAdminUsers();
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendEmail(admin.email, 'Order Approved by Seller', `
            <h1>Order #${id} Approved</h1>
            <p>Seller has approved order #${id}. Final admin approval required.</p>
          `);
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update seller approval" });
    }
  });

  app.put("/api/admin/orders/:id/approval", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, estimatedDeliveryDate } = req.body;
      const order = await storage.getOrderWithDetails(id);
      
      if (!order) return res.status(404).json({ message: "Order not found" });

      const updatedOrder = await storage.updateOrder(id, { 
        adminApproval: status,
        fulfillmentStatus: status === 'approved' ? 'admin_approved' : 'seller_approved',
        status: status === 'approved' ? 'confirmed' : order.status,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null
      });

      if (status === 'approved') {
        // Notify Buyer
        await sendEmail(order.buyer.email, 'Order Confirmed!', `
          <h1>Your order #${id} has been confirmed!</h1>
          <p>Estimated Delivery: ${new Date(estimatedDeliveryDate).toLocaleDateString()}</p>
          <p>A Kaydem Logistics agent will be assigned to your delivery.</p>
        `);

        // Notify Seller
        await sendEmail(order.seller.email, 'Order Confirmed by Hub', `
          <h1>Order #${id} is ready for fulfillment</h1>
          <p>Please prepare the item for pickup. Estimated delivery to buyer: ${new Date(estimatedDeliveryDate).toLocaleDateString()}</p>
        `);
      }

      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin approval" });
    }
  });

  app.put("/api/orders/:id/fulfillment-step", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { step } = req.body; // logistics_handover, in_transit, delivered
      
      const updatedOrder = await storage.updateOrder(id, { 
        fulfillmentStatus: step,
        deliveryStatus: step === 'delivered' ? 'delivered' : 'pending'
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update fulfillment step" });
    }
  });

  app.put("/api/orders/:id/buyer-confirmation", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmation } = req.body; // received, rejected
      const order = await storage.getOrderWithDetails(id);
      
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.buyerId !== req.userId) return res.status(403).json({ message: "Unauthorized" });

      const updatedOrder = await storage.updateOrder(id, { 
        buyerConfirmation: confirmation,
        buyerConfirmationAt: new Date(),
        fulfillmentStatus: confirmation === 'received' ? 'confirmed' : order.fulfillmentStatus,
        status: confirmation === 'received' ? 'completed' : 'rejected'
      });

      if (confirmation === 'received') {
        await sendEmail(order.buyer.email, 'Thank You!', `<h1>Thank you for shopping with us!</h1><p>Your order #${id} has been successfully delivered and confirmed.</p>`);
        
        // Notify Seller and Admin of success
        await sendEmail(order.seller.email, 'Delivery Successful!', `<p>Order #${id} has been confirmed by the buyer. Your payout is pending admin approval.</p>`);
      } else {
        // Notify Seller and Admin of rejection
        const adminUsers = await storage.getAdminUsers();
        const notificationMsg = `<h1>Order #${id} Rejected</h1><p>The buyer has rejected the product for order #${id}. Please investigate.</p>`;
        
        await sendEmail(order.seller.email, 'Order Rejected by Buyer', notificationMsg);
        for (const admin of adminUsers) {
          if (admin.email) await sendEmail(admin.email, 'Order Rejection Alert', notificationMsg);
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to process buyer confirmation" });
    }
  });

  app.post("/api/upload/verification", authenticateToken, imageUpload.fields([
    { name: 'idScan', maxCount: 1 },
    { name: 'idScanBack', maxCount: 1 },
    { name: 'faceScan', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { 
        idType, 
        whatsappBusinessNumber, 
        socialMediaPresence, 
        sellerVerificationType, 
        sellerAddress, 
        latitude, 
        longitude 
      } = req.body;
      
      if (!files || (!files.idScan && !files.faceScan)) {
        return res.status(400).json({ message: "No verification documents uploaded" });
      }

      const idScanUrl = files.idScan ? `/uploads/${files.idScan[0].filename}` : undefined;
      const idScanUrlBack = files.idScanBack ? `/uploads/${files.idScanBack[0].filename}` : undefined;
      const faceScanUrl = files.faceScan ? `/uploads/${files.faceScan[0].filename}` : undefined;

      // Update user verification status to pending (for sellers)
      await storage.updateUser(req.userId!, {
        idScanUrl,
        idScanUrlBack,
        faceScanUrl,
        idType,
        whatsappBusinessNumber,
        socialMediaPresence,
        sellerVerificationType,
        sellerAddress,
        sellerLatitude: latitude,
        sellerLongitude: longitude,
        verificationStatus: 'pending'
      });

      // Notify Admin
      const adminUsers = await storage.getAdminUsers();
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendEmail(admin.email, 'New Seller Verification Request', `
            <h1>New Verification Request</h1>
            <p>User ID: ${req.userId}</p>
            <p>Verification Type: ${sellerVerificationType}</p>
            <p>Please check the admin dashboard for details.</p>
          `);
        }
      }

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

  // Store logo change request
  app.post("/api/stores/:id/request-logo-change", authenticateToken, imageUpload.single('logo'), async (req: AuthRequest, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const store = await storage.getStoreById(storeId);
      
      if (!store) return res.status(404).json({ message: "Store not found" });
      if (store.userId !== req.userId) return res.status(403).json({ message: "Unauthorized" });
      
      if (!req.file) return res.status(400).json({ message: "No logo uploaded" });
      
      const pendingLogoUrl = `/uploads/${req.file.filename}`;
      await storage.updateStore(storeId, { pendingLogoUrl });
      
      // Notify Admin
      const adminUsers = await storage.getAdminUsers();
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendEmail(admin.email, 'Store Logo Change Request', `
            <h1>Store Logo Change Request</h1>
            <p>Store: ${store.name}</p>
            <p>Please check the admin dashboard to approve the new logo.</p>
          `);
        }
      }
      
      res.json({ pendingLogoUrl, message: "Logo change request submitted. Pending admin approval." });
    } catch (error) {
      console.error('Logo change request error:', error);
      res.status(500).json({ message: "Failed to submit logo change request" });
    }
  });

  // Upload buyer verification for checkout
  app.post("/api/upload/buyer-verification", apiLimiter, tryAuthenticate, imageUpload.fields([
    { name: 'buyerIdScan', maxCount: 1 },
    { name: 'buyerFaceScan', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { latitude, longitude } = req.body;

      if (!files || (!files.buyerIdScan && !files.buyerFaceScan)) {
        return res.status(400).json({ message: "No verification documents uploaded" });
      }

      const buyerIdScanUrl = files.buyerIdScan ? `/uploads/${files.buyerIdScan[0].filename}` : undefined;
      const buyerFaceScanUrl = files.buyerFaceScan ? `/uploads/${files.buyerFaceScan[0].filename}` : undefined;

      // Update buyer verification documents if user is logged in
      if (req.userId) {
        await storage.updateUser(req.userId, {
          buyerIdScanUrl,
          buyerFaceScanUrl,
          buyerLatitude: latitude,
          buyerLongitude: longitude,
          buyerVerifiedAt: new Date()
        });
      }

      res.json({
        buyerIdScanUrl,
        buyerFaceScanUrl,
        latitude,
        longitude,
        message: "Buyer verification documents uploaded successfully."
      });
    } catch (error) {
      console.error('Buyer verification upload error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Failed to upload buyer verification documents'
      });
    }
  });
  // Product image upload with AI Watermarking
  app.post("/api/upload/product", authenticateToken, imageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const outputPath = path.join('uploads', `wm_${fileName}`);

      console.log(`Processing product image: ${fileName}`);

      // AI Watermarking using Sharp
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      console.log(`Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      const watermarkText = Buffer.from(`
        <svg width="${metadata.width}" height="${metadata.height}">
          <style>
            .text { fill: white; font-family: sans-serif; font-weight: bold; opacity: 0.4; font-size: ${Math.floor(metadata.width! / 15)}px; }
          </style>
          <text x="80%" y="90%" text-anchor="middle" class="text">University Hub</text>
        </svg>
      `);

      await image
        .composite([{ input: watermarkText, top: 0, left: 0 }])
        .toFile(outputPath);

      console.log(`Successfully watermarked image: wm_${fileName}`);

      // Clean up original un-watermarked file
      const fs = await import('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ url: `/uploads/wm_${fileName}` });
    } catch (error) {
      console.error('Image processing error:', error);
      res.status(500).json({ message: "Failed to process image with AI watermarking", error: String(error) });
    }
  });

  // Upload seller verification for store approval
  app.post("/api/upload/seller-verification", apiLimiter, authenticateToken, imageUpload.fields([
    { name: 'idScan', maxCount: 1 },
    { name: 'faceScan', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { phoneNumber, latitude, longitude, address } = req.body;

      if (!files || !files.idScan || !files.faceScan) {
        return res.status(400).json({ message: "ID scan and facial capture are required" });
      }

      const idScanUrl = `/uploads/${files.idScan[0].filename}`;
      const faceScanUrl = `/uploads/${files.faceScan[0].filename}`;

      // Check if phone number is already taken by another user
      if (phoneNumber) {
        const existingUserWithPhone = await storage.getUserByPhoneNumber(phoneNumber);
        if (existingUserWithPhone && existingUserWithPhone.id !== req.userId) {
          return res.status(400).json({ message: "Phone number is already associated with another account" });
        }
      }

      // Update user verification details
      await storage.updateUser(req.userId!, {
        verificationStatus: 'pending',
        idScanUrl,
        faceScanUrl,
        phoneNumber: phoneNumber || undefined
      });

      // Update user's stores to pending status (so admin can see them)
      const userStores = await storage.getStoresByUserId(req.userId!);
      for (const store of userStores) {
        if (store.approvalStatus === 'waiting_verification' || store.approvalStatus === 'rejected') {
          await storage.updateStore(store.id, {
            latitude: latitude || store.latitude,
            longitude: longitude || store.longitude,
            address: address || store.address
          });
          await storage.updateStoreApprovalStatus(store.id, 'pending');
        }
      }

      res.json({ message: "Verification submitted successfully. Waiting for admin approval." });
    } catch (error) {
      console.error("Seller verification error:", error);
      res.status(500).json({ message: "Failed to submit verification" });
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

  app.post("/api/categories", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, icon, color } = req.body;
      const category = await storage.createCategory({ name, icon, color });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Weekly Deals Admin
  app.get("/api/admin/weekly-deals", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const deals = await storage.getWeeklyDeals();
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly deals" });
    }
  });

  app.post("/api/admin/weekly-deals", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const dealData = insertWeeklyDealSchema.parse(req.body);
      const deal = await storage.createWeeklyDeal(dealData);
      res.json(deal);
    } catch (error) {
      res.status(400).json({ message: "Invalid deal data" });
    }
  });

  app.delete("/api/admin/weekly-deals/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWeeklyDeal(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  // Campus Activity Admin
  app.get("/api/admin/campus-activity", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const activities = await storage.getCampusActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campus activity" });
    }
  });

  app.post("/api/admin/campus-activity", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const activityData = insertCampusActivitySchema.parse(req.body);
      const activity = await storage.createCampusActivity(activityData);
      res.json(activity);
    } catch (error) {
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  app.delete("/api/admin/campus-activity/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampusActivity(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Public Routes for weekly deals and campus activity
  app.get("/api/weekly-deals", async (req, res) => {
    try {
      const deals = await storage.getWeeklyDeals();
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly deals" });
    }
  });

  app.get("/api/campus-activity", async (req, res) => {
    try {
      let activities = await storage.getCampusActivities();
      
      // If feed is thin, add real product activity from sellers
      if (activities.length < 10) {
        const recentProducts = await storage.getProductsWithStore({ limit: 10 });
        for (const p of recentProducts) {
           // Only add if not already present (simplified check)
           const existing = activities.find(a => a.title.includes(p.title));
           if (!existing) {
             await storage.createCampusActivity({
                userId: p.store.userId,
                title: `New Item in ${p.store.name}`,
                content: `Check out the new ${p.title} available now at ${p.store.university}.`,
                source: 'internal',
                activityType: 'sale',
                imageUrl: p.images[0]
             });
           }
        }
        activities = await storage.getCampusActivities();
      }

      // Final seed check if still empty
      if (activities.length === 0) {
        const seedActivities = [
          { title: "KNUST SRC Week 2026", content: "Main campus celebrations starting this weekend. Check out the local flea market!", source: "facebook", activityType: "activity" },
          { title: "University of Ghana Exams", content: "End of semester examinations begin next Monday. Study groups now forming in the Balme Library.", source: "google", activityType: "news" },
          { title: "Senior High Admissions", content: "CSSPS portal now open for SHS admissions check. 2026 Batch placement updates live.", source: "google", activityType: "news" }
        ];

        for (const seed of seedActivities) {
          await storage.createCampusActivity(seed);
        }
        
        activities = await storage.getCampusActivities();
      }
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campus activity" });
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
      console.error("Product creation validation error:", error);
      res.status(400).json({ message: "Invalid product data", error: error instanceof Error ? error.message : String(error) });
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

  app.get("/api/products/:id/suggestions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductWithStore(id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Find candidates from other sellers in the same category
      const candidates = await storage.getProductsWithStore({ 
        categoryId: product.categoryId,
        limit: 15
      });
      
      const otherSellersCandidates = candidates.filter(c => c.storeId !== product.storeId && c.id !== product.id);

      const { generateProductSuggestions } = await import('./ai');
      const suggestions = await generateProductSuggestions(product, otherSellersCandidates);
      res.json(suggestions);
    } catch (error) {
      console.error("Suggestions Endpoint Error:", error);
      res.status(500).json({ message: "Failed to fetch product suggestions" });
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
      if (!store || (store.userId !== req.userId && !req.user?.isAdmin)) {
        return res.status(403).json({ message: "You do not have permission to update this product" });
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
  app.post("/api/orders", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { cartItems, paymentMode, isBokoo, details, totalAmount, codFee, shippingMode, shippingFee } = req.body;
      const userId = req.userId;

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Create orders for each item
      const createdOrders = [];
      for (const item of cartItems) {
        // Fetch product to get sellerId (which is store user id)
        const productWithStore = await storage.getProductWithStore(item.productId);
        if (!productWithStore) continue;

        const order = await storage.createOrder({
          buyerId: userId || 1, // Default to system user for guest orders
          sellerId: productWithStore.store.userId,
          productId: item.productId,
          quantity: item.quantity,
          totalAmount: totalAmount ? totalAmount.toString() : productWithStore.price,
          codFee: codFee ? codFee.toString() : null,
          status: 'pending',
          shippingMode: (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
          buyerAddress: details?.address || '',
          buyerUniversity: details?.university || '',
          buyerPhone: details?.phoneNumber || '',
          buyerEmail: details?.email || '',
        });
        createdOrders.push(order);
      }

      // Send secondary "Thank You" email with tracking info
      try {
        const { sendPurchaseConfirmationEmail } = await import('./email');
        const trackingUrl = `${process.env.APP_URL || 'https://uniexchangehub.com'}/gh/orders`;
        const buyerName = details ? `${details.firstName} ${details.lastName}` : "Customer";
        
        await sendPurchaseConfirmationEmail(
          details?.email || '',
          buyerName,
          createdOrders[0]?.id || 0,
          (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
          trackingUrl,
          paymentMode === 'cod',
          totalAmount ? totalAmount.toString() : "0"
        );
      } catch (emailErr) {
        console.error('Failed to send secondary purchase confirmation email:', emailErr);
      }

      res.json({ message: "Order placed successfully", orders: createdOrders });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.post("/api/buyer-verification", authenticateToken, inMemoryUpload.fields([
    { name: 'buyerId', maxCount: 1 },
    { name: 'buyerFace', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const userId = req.userId!;

      if (!files.buyerId || !files.buyerFace) {
        return res.status(400).json({ message: "Both ID and face scan are required" });
      }

      const { uploadToDrive } = await import('./google-drive');
      
      const idUrl = await uploadToDrive(files.buyerId[0], `buyer_${userId}_id_${Date.now()}`);
      const faceUrl = await uploadToDrive(files.buyerFace[0], `buyer_${userId}_face_${Date.now()}`);

      const updatedUser = await storage.updateUser(userId, {
        buyerIdScanUrl: idUrl,
        buyerFaceScanUrl: faceUrl,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Buyer verification upload error:', error);
      res.status(500).json({ message: "Failed to upload verification documents" });
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

  // Confirm payment and create orders
  app.post("/api/orders/confirm-payment", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!stripe) return res.status(500).json({ message: "Payment service not configured" });

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not succeeded" });
      }

      const { 
        userId, 
        cartItems: cartItemsRaw, 
        shippingMode, 
        isBokoo, 
        guestDetails: guestDetailsRaw,
        buyerLatitude,
        buyerLongitude,
        verificationUrls: verificationUrlsRaw
      } = paymentIntent.metadata;

      const cartItems = JSON.parse(cartItemsRaw);
      const guestDetails = guestDetailsRaw ? JSON.parse(guestDetailsRaw) : null;
      const verificationUrls = verificationUrlsRaw ? JSON.parse(verificationUrlsRaw) : null;

      let buyerId = userId !== "guest" ? parseInt(userId) : null;
      
      const createdOrders = [];
      for (const item of cartItems) {
        const product = await storage.getProductById(item.productId);
        if (!product) continue;

        const store = await storage.getStoreById(product.storeId);
        if (!store) continue;

        const order = await storage.createOrder({
          buyerId: buyerId || 0,
          sellerId: store.userId,
          productId: product.id,
          quantity: item.quantity,
          totalAmount: (parseFloat(product.price.toString()) * item.quantity).toString(),
          status: 'confirmed',
          shippingMode: shippingMode || 'ghana_post_standard',
          deliveryStatus: 'pending',
          buyerLatitude: buyerLatitude,
          buyerLongitude: buyerLongitude,
          buyerAddress: guestDetails?.address,
          buyerUniversity: guestDetails?.university,
          buyerCity: guestDetails?.city,
          buyerPhone: guestDetails?.phoneNumber,
          buyerEmail: guestDetails?.email,
          payoutStatus: isBokoo === 'true' ? 'installment_active' : 'pending'
        });
        
        createdOrders.push(order);
      }

      // Clear cart
      if (buyerId) {
        await storage.clearCart(buyerId);
      }

      // Send notifications
      const { sendOrderConfirmation } = await import('./notifications');
      let buyerInfo: any;
      if (buyerId) {
        buyerInfo = await storage.getUserById(buyerId);
      } else if (guestDetails) {
        buyerInfo = {
          firstName: guestDetails.firstName,
          lastName: guestDetails.lastName,
          email: guestDetails.email,
          phoneNumber: guestDetails.phoneNumber
        };
      }

      if (buyerInfo) {
        for (const order of createdOrders) {
          const product = await storage.getProductById(order.productId);
          if (product) {
            await sendOrderConfirmation(order, buyerInfo, product);
          }
        }
      }

      res.json({ message: "Orders created successfully", orders: createdOrders });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ message: "Failed to create orders after payment" });
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

  // Tracking update route
  app.put("/api/orders/:id/tracking", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackingData = req.body;

      // Verify user is the seller or an admin
      const order = await storage.getOrderById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });

      const user = await storage.getUserById(req.userId!);
      if (order.sellerId !== req.userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized to update tracking" });
      }

      const updatedOrder = await storage.updateOrderTracking(id, trackingData);
      
      // Notify buyer about tracking update
      if (updatedOrder) {
        const { sendTrackingUpdate } = await import('./notifications');
        const buyer = await storage.getUserById(updatedOrder.buyerId);
        const product = await storage.getProductById(updatedOrder.productId);
        if (buyer && product) {
          await sendTrackingUpdate(updatedOrder, buyer, product);
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Tracking update error:", error);
      res.status(500).json({ message: "Failed to update tracking information" });
    }
  });

  // Buyer confirms product received or rejected
  app.put("/api/orders/:id/buyer-confirmation", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/messages/conversations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getUserConversations(req.userId!);
      res.json(conversations);
    } catch (error) {
      console.error("Fetch Conversations Error:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
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

  // Admin routes for moderation and analytics
  app.get("/api/admin/analytics", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform analytics" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === req.userId) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }
      const deleted = await storage.deleteUser(id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/products/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const pendingProducts = await storage.getPendingProducts();
      res.json(pendingProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending products" });
    }
  });

  app.get("/api/admin/stores/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const stores = await storage.getPendingStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending stores" });
    }
  });

  app.get("/api/admin/users/pending-verification", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const pendingUsers = allUsers.filter(u => u.verificationStatus === 'pending');
      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending verifications" });
    }
  });

  app.get("/api/admin/users/pending-buyer-verification", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Users who have uploaded verification but haven't been approved yet
      const pendingBuyers = allUsers.filter(u => u.buyerIdScanUrl && u.buyerFaceScanUrl && !u.buyerVerifiedAt);
      res.json(pendingBuyers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending buyer verifications" });
    }
  });

  app.put("/api/admin/users/:userId/approve-buyer", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.updateUser(userId, { buyerVerifiedAt: new Date() });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve buyer verification" });
    }
  });

  app.get("/api/admin/logo-changes", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const stores = await storage.getPendingLogoChanges();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending logo changes" });
    }
  });

  app.get("/api/admin/orders/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allOrders = await db.select().from(orders).where(eq(orders.sellerApproval, 'approved'));
      const ordersWithDetails = [];
      for (const order of allOrders) {
        const details = await storage.getOrderWithDetails(order.id);
        if (details && details.adminApproval === 'pending') {
          ordersWithDetails.push(details);
        }
      }
      res.json(ordersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending orders" });
    }
  });

  app.get("/api/admin/payouts/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allOrders = await db.select().from(orders).where(eq(orders.payoutStatus, 'pending'));
      const ordersWithDetails = [];
      for (const order of allOrders) {
        const details = await storage.getOrderWithDetails(order.id);
        if (details && details.status === 'completed') {
          ordersWithDetails.push(details);
        }
      }
      res.json(ordersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending payouts" });
    }
  });

  app.put("/api/admin/orders/:id/payout", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body; // processed, cancelled
      
      const updatedOrder = await storage.updateOrder(id, { 
        payoutStatus: status,
        payoutProcessedAt: status === 'processed' ? new Date() : null
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payout status" });
    }
  });

  app.put("/api/admin/stores/:id/logo-approval", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      let store;
      if (status === 'approved') {
        store = await storage.approveLogoChange(id);
      } else {
        store = await storage.rejectLogoChange(id);
      }

      if (!store) return res.status(404).json({ message: "Store not found" });
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update logo status" });
    }
  });

  app.put("/api/admin/users/:id/verify", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const user = await storage.updateUser(id, {
        verificationStatus: status === 'verified' ? 'verified' : 'rejected',
        verificationNotes: feedback,
        verifiedAt: status === 'verified' ? new Date() : null
      });
      
      if (!user) return res.status(404).json({ message: "User not found" });

      if (status === 'verified') {
        try {
          const { uploadVerificationToDrive } = await import('./google-drive');
          uploadVerificationToDrive(user).catch(err => console.error('Drive backup failed:', err));
        } catch (e) {
          console.error('Failed to import google-drive service:', e);
        }
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update verification status" });
    }
  });

  // PayStack & Config Routes
  app.get("/api/admin/config/:key", async (req, res) => {
    const value = await storage.getAppConfig(req.params.key);
    res.json({ value });
  });

  app.post("/api/admin/config", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { key, value } = req.body;
    await storage.setAppConfig(key, value);
    res.json({ success: true });
  });

  // Paystack Direct MoMo Charge
  app.post("/api/paystack/charge-momo", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { amount, email, phoneNumber, metadata } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required for MoMo payment" });
      }

      // Format phone number for Paystack (Ghana international format 233...)
      let cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/\+/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '233' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('233') && cleanPhone.length === 9) {
        cleanPhone = '233' + cleanPhone;
      }
      
      // Basic provider detection for Ghana
      let provider = 'mtn'; // default
      if (cleanPhone.includes('23320') || cleanPhone.includes('23350')) {
        provider = 'vod'; // Telecel (formerly Vodafone)
      } else if (cleanPhone.includes('23326') || cleanPhone.includes('23356') || cleanPhone.includes('23327') || cleanPhone.includes('23357')) {
        provider = 'tgo'; // AT (formerly AirtelTigo)
      }

      const paystackAmount = Math.round(amount * 100);
      
      const key = process.env.PAYSTACK_SECRET_KEY;
      console.log('Initiating Paystack MoMo charge:', { 
        email, 
        cleanPhone, 
        provider, 
        amount: paystackAmount,
        keyPrefix: key ? key.substring(0, 7) : 'undefined'
      });

      const response = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paystackAmount,
          email,
          currency: "GHS",
          mobile_money: {
            phone: cleanPhone,
            provider: provider
          },
          metadata
        })
      });

      const data = await response.json();
      console.log('Paystack charge response:', JSON.stringify(data, null, 2));
      
      if (!data.status) {
        return res.status(400).json({ message: data.message || "Failed to initiate charge" });
      }

      res.json(data.data);
    } catch (error) {
      console.error('PayStack MoMo charge error:', error);
      res.status(500).json({ message: "Failed to initiate MoMo payment" });
    }
  });

  app.post("/api/paystack/initialize", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { amount, email, metadata } = req.body;
      
      let planCode = null;
      if (metadata.isBokoo && metadata.recurringAmount > 0) {
        // Create a unique plan for the deferred installments
        planCode = await createPaystackPlan(metadata.recurringAmount, `Bɔkɔɔ Installment - ${email} - ${Date.now()}`);
      }

      // PayStack uses minor units (pesewas for GHS)
      const paystackAmount = Math.round(amount * 100);
      
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paystackAmount,
          email,
          currency: "GHS",
          channels: ["mobile_money", "card"],
          plan: planCode || undefined,
          metadata
        })
      });

      const data = await response.json();
      if (!data.status) throw new Error(data.message);
      
      res.json(data.data);
    } catch (error) {
      console.error('PayStack initialize error:', error);
      res.status(500).json({ message: "Failed to initialize payment" });
    }
  });

  // Paystack Webhook Handler
  app.post("/api/paystack/webhook", async (req, res) => {
    try {
      // Validate Paystack signature
      const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Invalid signature');
      }

      const event = req.body;
      console.log('Received Paystack Webhook Event:', event.event);

      if (event.event === 'charge.success') {
        console.log(`Processing successful payment via webhook for reference: ${event.data.reference}`);
        await finalizePaystackOrder(event.data);
      }

      res.status(200).send('Webhook processed');
    } catch (error) {
      console.error('Paystack Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get("/api/paystack/verify/:reference", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { reference } = req.params;
      console.log(`Verifying Paystack transaction: ${reference}`);
      
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      });

      const data = await response.json();
      if (!data.status || data.data.status !== 'success') {
        console.error('Paystack verification failed:', data);
        return res.status(400).json({ message: "Payment verification failed" });
      }

      // Finalize order (helper handles deduplication)
      const createdOrders = await finalizePaystackOrder(data.data);

      res.json({ message: "Payment verified and orders processed", orders: createdOrders });
    } catch (error) {
      console.error('PayStack verify error:', error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });


  app.get("/api/admin/stores", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allStores = await storage.getAllStoresForAdmin();
      res.json(allStores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all stores" });
    }
  });

  app.put("/api/admin/products/:id/approval", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const product = await storage.updateProductApprovalStatus(id, status);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Notify seller
      const store = await storage.getStoreById(product.storeId);
      if (store) {
        const seller = await storage.getUserById(store.userId);
        if (seller && seller.email) {
          const subject = status === 'approved' ? 'Product Approved!' : 'Update on your Product Listing';
          const html = `
            <h1>Product ${status === 'approved' ? 'Approved' : 'Status Update'}</h1>
            <p>Your product "${product.title}" has been ${status}.</p>
            ${feedback ? `<p><strong>Admin Feedback:</strong> ${feedback}</p>` : ''}
            <p>Thank you for using The University Hub.</p>
          `;
          await sendEmail(seller.email, subject, html);
        }
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product status" });
    }
  });

  app.put("/api/admin/products/:id/eligibility", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isEligible } = req.body;
      const updatedProduct = await storage.updateProductEligibility(id, isEligible);
      if (updatedProduct) {
        res.json(updatedProduct);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update product eligibility" });
    }
  });

  app.put("/api/admin/stores/:id/approval", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const store = await storage.updateStoreApprovalStatus(id, status);
      if (!store) return res.status(404).json({ message: "Store not found" });

      // If store is approved, also mark user as verified
      if (status === 'approved') {
        const user = await storage.updateUser(store.userId, {
          verificationStatus: 'verified',
          verifiedAt: new Date()
        });
        
        if (user) {
          try {
            const { uploadVerificationToDrive } = await import('./google-drive');
            uploadVerificationToDrive(user).catch(err => console.error('Drive backup failed:', err));
          } catch (e) {
            console.error('Failed to import google-drive service:', e);
          }
        }
      } else if (status === 'rejected') {
        await storage.updateUser(store.userId, {
          verificationStatus: 'rejected',
          verificationNotes: feedback
        });
      }

      // Notify seller
      const seller = await storage.getUserById(store.userId);
      if (seller && seller.email) {
        const subject = status === 'approved' ? 'Store Approved!' : 'Update on your Store Status';
        const html = `
          <h1>Store ${status === 'approved' ? 'Approved' : 'Status Update'}</h1>
          <p>Your store "${store.name}" has been ${status}.</p>
          ${feedback ? `<p><strong>Admin Feedback:</strong> ${feedback}</p>` : ''}
          <p>Thank you for using The University Hub.</p>
        `;
        await sendEmail(seller.email, subject, html);
      }

      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update store status" });
    }
  });

  app.put("/api/admin/stores/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive, feedback } = req.body;

      const store = await storage.updateStoreIsActive(id, isActive);      if (!store) return res.status(404).json({ message: "Store not found" });

      // Notify seller about suspension
      if (isActive === false) {
        const seller = await storage.getUserById(store.userId);
        if (seller && seller.email) {
          const subject = 'Your Store has been Suspended';
          const html = `
            <h1 style="color: #F62E28;">Store Suspended</h1>
            <p>Your store "${store.name}" has been suspended by an administrator.</p>
            ${feedback ? `<p><strong>Reason for Suspension:</strong> ${feedback}</p>` : ''}
            <p>Please contact support or resolve the issues mentioned above to reactivate your store.</p>
          `;
          await sendEmail(seller.email, subject, html);
        }
      }

      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  app.delete("/api/admin/stores/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { feedback } = req.body;
      
      const store = await storage.getStoreById(id);
      if (!store) return res.status(404).json({ message: "Store not found" });

      const seller = await storage.getUserById(store.userId);
      const storeName = store.name;
      
      const deleted = await storage.deleteStore(id);
      
      if (deleted && seller && seller.email) {
        const subject = 'Your Store has been Removed';
        const html = `
          <h1>Store Removed</h1>
          <p>Your store "${storeName}" has been removed from the platform.</p>
          ${feedback ? `<p><strong>Reason/Feedback:</strong> ${feedback}</p>` : ''}
          <p>If you have questions, please contact support.</p>
        `;
        await sendEmail(seller.email, subject, html);
      }

      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { feedback } = req.body;
      
      const product = await storage.getProductById(id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const store = await storage.getStoreById(product.storeId);
      const productTitle = product.title;
      
      const deleted = await storage.deleteProduct(id);
      
      if (deleted && store) {
        const seller = await storage.getUserById(store.userId);
        if (seller && seller.email) {
          const subject = 'Product Listing Removed';
          const html = `
            <h1>Product Removed</h1>
            <p>Your product listing "${productTitle}" has been removed from the platform.</p>
            ${feedback ? `<p><strong>Reason/Feedback:</strong> ${feedback}</p>` : ''}
            <p>If you have questions, please contact support.</p>
          `;
          await sendEmail(seller.email, subject, html);
        }
      }

      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
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
      const { storeId, categoryId, title, description, price, originalPrice, condition, images, specialOffer, mediaGifUrl } = req.body;

      // Validate required fields
      if (!storeId || !categoryId || !title || !description || !price || !condition || !images || images.length === 0 || !mediaGifUrl) {
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
        mediaGifUrl,
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
  app.post("/api/create-payment-intent", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { amount, cartItems, isBokoo, guestDetails, buyerLocation, verificationUrls } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripe || !stripeKey || stripeKey.includes('placeholder')) {
        return res.status(400).json({ message: "Payment service not fully configured yet. Please try Mobile Money or Bank Transfer." });
      }

      const userId = req.userId;

      const paymentIntent = await stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "ghs",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: userId?.toString() || "guest",
          cartItems: JSON.stringify(cartItems || []),
          isBokoo: isBokoo ? "true" : "false",
          guestDetails: guestDetails ? JSON.stringify(guestDetails) : undefined,
          buyerLatitude: buyerLocation?.latitude || undefined,
          buyerLongitude: buyerLocation?.longitude || undefined,
          verificationUrls: verificationUrls ? JSON.stringify(verificationUrls) : undefined,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      res.status(400).json({ message: "Payment Gateway Error: " + error.message + ". Try an alternative payment mode." });
    }
  });
  // Push notification routes
  
  // Get VAPID public key for client
  app.get("/api/push/vapid-key", async (req, res) => {
    try {
      const { getVapidPublicKey } = await import('./push-notifications');
      const publicKey = getVapidPublicKey();
      
      if (!publicKey) {
        return res.status(503).json({ message: "Push notifications not configured" });
      }
      
      res.json({ publicKey });
    } catch (error) {
      res.status(500).json({ message: "Failed to get VAPID key" });
    }
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { subscription } = req.body;
      
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription" });
      }

      const { saveSubscription } = await import('./push-notifications');
      const saved = await saveSubscription(req.userId!, subscription);
      
      if (saved) {
        res.json({ message: "Subscription saved successfully" });
      } else {
        res.status(500).json({ message: "Failed to save subscription" });
      }
    } catch (error) {
      console.error('Push subscribe error:', error);
      res.status(500).json({ message: "Failed to subscribe to push notifications" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { removeSubscription } = await import('./push-notifications');
      const removed = await removeSubscription(req.userId!);
      
      if (removed) {
        res.json({ message: "Unsubscribed successfully" });
      } else {
        res.status(500).json({ message: "Failed to unsubscribe" });
      }
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Test push notification (for development/debugging)
  app.post("/api/push/test", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { sendPushNotification, NotificationTypes } = await import('./push-notifications');
      
      const success = await sendPushNotification(
        req.userId!,
        NotificationTypes.promotion(
          'Test Notification 🔔',
          'Push notifications are working! You will receive updates for orders, messages, and more.'
        )
      );
      
      if (success) {
        res.json({ message: "Test notification sent" });
      } else {
        res.status(500).json({ message: "Failed to send test notification. Make sure you're subscribed." });
      }
    } catch (error) {
      console.error('Test push error:', error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}