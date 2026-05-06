import { z } from "zod";
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
import fs, { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { generateStoreProfile, generateProductDescription, analyzeProductImage, verifyFaceMatch, extractProductFromHtml } from "./ai";
import { isWooCommerce, extractWooCommerceProduct } from "./woocommerce-service";
import { uploadToGCS } from "./gcs-storage";
import { sendVerificationEmail, sendEmail as sendLocalEmail, sendPurchaseConfirmationEmail } from "./email";
import crypto from 'crypto';
import { generateToken, authenticateToken, tryAuthenticate, requireAdmin, type AuthRequest } from "./auth";
import { sendOrderConfirmation, notifyAdminOfVerificationRequest } from "./notifications";
import path from "path";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { Resend } from 'resend';
import sharp from 'sharp';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

const upload = multer({ storage: multer.memoryStorage() });

// Configure multer for image uploads with validation
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images and videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, GIF images and MP4, MOV, AVI, WEBM videos are allowed'));
    }
  }
});

// Helper function to save files either to GCS or local disk
const saveFile = async (file: Express.Multer.File): Promise<string> => {
  const extension = path.extname(file.originalname);
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

  if (process.env.GAE_ENV || process.env.NODE_ENV === 'production') {
    return await uploadToGCS(file.buffer, fileName, file.mimetype);
  } else {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    const filePath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    return `/uploads/${fileName}`;
  }
};

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
      status: product.isDigital ? 'completed' : 'confirmed',
      paymentReference: reference,
      paymentGateway: 'paystack',
      shippingMode: product.isDigital ? 'digital_delivery' : (metadata.shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
      fulfillmentStatus: product.isDigital ? 'delivered' : 'order_received',
      buyerAddress: guestDetails?.address || buyerInfo?.sellerAddress || 'Provided at checkout',
      buyerEmail: buyerEmail,
      payoutStatus: 'pending',
      
      // Verification details from metadata
      verificationType: metadata.verificationType,
      verificationOccupation: metadata.verificationOccupation,
      verificationSalary: metadata.verificationSalary,
      verificationIdType: metadata.verificationIdType,
      verificationIdFrontUrl: metadata.verificationIdFrontUrl,
      verificationIdBackUrl: metadata.verificationIdBackUrl,
      guardianName: metadata.guardianName,
      guardianOccupation: metadata.guardianOccupation,
      guardianSalary: metadata.guardianSalary,
      guardianPhone: metadata.guardianPhone,
      guardianIdUrl: metadata.guardianIdUrl,
      guardianFaceWithIdUrl: metadata.guardianFaceWithIdUrl,

      // Installment info - only applied if the product itself is eligible
      isInstallment: isThisItemEligible,
      installmentsPaid: isThisItemEligible ? 1 : 0,
      installmentAmount: isThisItemEligible ? itemRecurringAmount.toFixed(2) : null,
      installmentDebt: "0",
      penaltyAmount: "0",
      lastInstallmentDate: isThisItemEligible ? new Date() : null,
      nextInstallmentDate: isThisItemEligible ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) : null, // Start checking from 20 days later
      isDefaulted: false,
      paystackAuthCode: data.authorization?.authorization_code || null,
    });
    
    createdOrders.push(order);

    // Send confirmation emails
    try {
      const { sendOrderConfirmation, notifySellerOfNewOrder, notifyAdminOfNewOrder } = await import('./notifications');
      const buyerForEmail = buyerInfo || { firstName: buyerName.split(' ')[0], email: buyerEmail };
      const seller = await storage.getUserById(store.userId);

      // 1. Notify Buyer
      await sendOrderConfirmation(order, buyerForEmail, product);
      
      // 2. Notify Seller
      if (seller) {
        await notifySellerOfNewOrder(order, seller, product);
      }

      // 3. Notify Admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        if (admin.email) {
          await notifyAdminOfNewOrder(order, admin.email, product, seller || { username: 'Unknown', email: 'N/A' });
        }
      }
    } catch (err) {
      console.error('Failed to send order notifications:', err);
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
  // EMERGENCY DB SCHEMA FIXES FOR PRODUCTION
  try {
    console.log("PRODUCTION DB SYNC: Checking and fixing schema...");
    const { sql } = await import('drizzle-orm');
    
    // Categories Table Fixes - MUST BE FIRST to avoid errors in subsequent steps
    try {
      await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER;`);
      console.log("PRODUCTION DB SYNC: parent_id column checked/added.");
    } catch (e) { console.log("Note: Categories schema updates skipped or already present."); }

    // Products Table Fixes
    try {
      await db.execute(sql`ALTER TABLE products ALTER COLUMN media_gif_url DROP NOT NULL;`);
      await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_installment_eligible BOOLEAN DEFAULT true NOT NULL;`);
    } catch (e) { console.log("Note: Products schema updates skipped."); }

    // Orders Table Fixes
    try {
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_processed_at TIMESTAMP;`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false NOT NULL;`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS installments_paid INTEGER DEFAULT 0 NOT NULL;`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(10,2);`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS next_installment_date TIMESTAMP;`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_auth_code TEXT;`);
    } catch (e) { console.log("Note: Orders schema updates skipped."); }

    // Users Table Fixes
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP;`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS id_scan_url_back TEXT;`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;`);
    } catch (e) { console.log("Note: Users schema updates skipped."); }

    // Seed Categories if needed
    try {
      const existingCategories = await storage.getAllCategories();
      if (existingCategories.length <= 6) { 
        console.log("PRODUCTION DB SEED: Seeding proper categories...");
        const categoryData = [
          { name: "Electronics", icon: "fas fa-laptop", color: "blue-100", subcategories: [
            { name: "Laptops", icon: "fas fa-laptop", color: "blue-100" },
            { name: "Smartphones", icon: "fas fa-mobile", color: "blue-100" },
            { name: "Headphones", icon: "fas fa-headphones", color: "blue-100" },
            { name: "Accessories", icon: "fas fa-plug", color: "blue-100" },
          ]},
          { name: "Academic", icon: "fas fa-book", color: "yellow-100", subcategories: [
            { name: "Textbooks", icon: "fas fa-book", color: "yellow-100" },
            { name: "Stationery", icon: "fas fa-pen", color: "yellow-100" },
            { name: "Lab Gear", icon: "fas fa-microscope", color: "yellow-100" },
          ]},
          { name: "Fashion", icon: "fas fa-tshirt", color: "pink-100", subcategories: [
            { name: "Clothing", icon: "fas fa-tshirt", color: "pink-100" },
            { name: "Shoes", icon: "fas fa-shoe-prints", color: "pink-100" },
            { name: "Accessories", icon: "fas fa-hat-cowboy", color: "pink-100" },
          ]},
          { name: "Home & Dorm", icon: "fas fa-home", color: "green-100", subcategories: [
            { name: "Furniture", icon: "fas fa-chair", color: "green-100" },
            { name: "Kitchenware", icon: "fas fa-utensils", color: "green-100" },
            { name: "Bedding", icon: "fas fa-bed", color: "green-100" },
          ]},
          { name: "Sports & Leisure", icon: "fas fa-football", color: "red-100", subcategories: [
            { name: "Gym Gear", icon: "fas fa-dumbbell", color: "red-100" },
            { name: "Musical Instruments", icon: "fas fa-music", color: "red-100" },
            { name: "Games", icon: "fas fa-gamepad", color: "red-100" },
          ]},
          { name: "Services", icon: "fas fa-graduation-cap", color: "purple-100", subcategories: [
            { name: "Tutoring", icon: "fas fa-user-graduate", color: "purple-100" },
            { name: "Delivery", icon: "fas fa-car", color: "purple-100" },
            { name: "Hair & Beauty", icon: "fas fa-heart", color: "purple-100" },
          ]},
        ];

        for (const cat of categoryData) {
          let parent = existingCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
          if (!parent) {
            parent = await storage.createCategory({ name: cat.name, icon: cat.icon, color: cat.color });
          }
          for (const sub of cat.subcategories) {
            const existingSub = existingCategories.find(c => c.name.toLowerCase() === sub.name.toLowerCase());
            if (!existingSub) {
              await storage.createCategory({ name: sub.name, icon: sub.icon, color: sub.color, parentId: parent.id });
            }
          }
        }
        console.log("PRODUCTION DB SEED: Categories seeded!");
      }
    } catch (e) { console.log("Note: Category seeding failed:", e); }
    
    console.log("PRODUCTION DB SYNC: Success!");
  } catch (error) {
    console.log("PRODUCTION DB SYNC: Note - Critical failure in schema sync:", error instanceof Error ? error.message : String(error));
  }

  // Identity Verification - Face Matching
  app.post("/api/verify/face-match", async (req: any, res: any) => {
    try {
      const { idPhoto, liveSelfie } = req.body;
      if (!idPhoto || !liveSelfie) {
        return res.status(400).json({ message: "Both ID photo and live selfie are required" });
      }

      const result = await verifyFaceMatch(idPhoto, liveSelfie);
      res.json(result);
    } catch (error) {
      console.error("Face Match Route Error:", error);
      res.status(500).json({ message: "Verification service error" });
    }
  });

  // Magic Product Import - Extract from URL
  app.post("/api/products/extract-url", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`Magic Import: Fetching content from ${url}`);
      
      let html = '';
      try {
        // First attempt with full headers
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          html = await response.text();
        } else if (response.status === 403 || response.status === 401) {
          // Secondary attempt with minimalist headers if forbidden
          console.log(`Magic Import: Primary fetch failed (${response.status}), trying secondary attempt...`);
          const response2 = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (response2.ok) {
            html = await response2.text();
          } else {
            return res.status(400).json({ message: "This website is protecting its data from being imported. Please try another product link." });
          }
        } else {
          return res.status(400).json({ message: `Failed to fetch URL: ${response.statusText}` });
        }
      } catch (fetchErr) {
        console.error("Fetch Error:", fetchErr);
        return res.status(400).json({ message: "Could not connect to the provided URL. Please check the link and try again." });
      }

      if (!html) {
        return res.status(400).json({ message: "Failed to retrieve content from the provided URL." });
      }

      let extractedData;
      try {
        if (isWooCommerce(html)) {
          console.log("Magic Import: WooCommerce site detected, using specialized extraction");
          extractedData = await extractWooCommerceProduct(html, url);
        } else {
          extractedData = await extractProductFromHtml(html);
        }
      } catch (aiErr) {
        console.error("AI Extraction error in route:", aiErr);
        return res.status(400).json({ message: aiErr instanceof Error ? aiErr.message : "AI extraction failed" });
      }
      
      // Resolve category ID from AI suggestion
      const categories = await storage.getAllCategories();
      let categoryId = 1; // Default
      
      const matchedCat = categories.find(c => 
        c.name.toLowerCase() === extractedData.subcategoryName?.toLowerCase() ||
        c.name.toLowerCase() === extractedData.categoryName?.toLowerCase()
      );
      
      if (matchedCat) {
        categoryId = matchedCat.id;
      }

      res.json({ ...extractedData, categoryId });
    } catch (error) {
      console.error("Magic Import Error:", error);
      res.status(500).json({ message: "Failed to extract product data from the provided URL." });
    }
  });

  const { registerFeatureRoutes } = await import('./feature-routes');
  registerFeatureRoutes(app);

  const { registerBookmarkRoutes } = await import('./bookmark-routes');
  registerBookmarkRoutes(app);

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
      // Strip fields that are not in the users table to avoid Zod validation errors
      const { university, businessName, city, idType, ...baseUserData } = userData;

      const sellerData = {
        ...baseUserData,
        university,
        city,
        idType,
        userType: 'seller',
        isMerchant: true,
      };
      
      try {
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
      } catch (zodError: any) {
        if (zodError instanceof z.ZodError) {
          console.error('Seller registration validation error:', zodError.errors);
          return res.status(400).json({ 
            message: "Invalid seller data", 
            details: zodError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') 
          });
        }
        throw zodError;
      }
    } catch (error) {
      console.error('Seller registration error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid seller data" });
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

      const imageUrls = await Promise.all(
        (req.files as Express.Multer.File[]).map(file => saveFile(file))
      );
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
      
      // Allow if user is the seller OR an admin
      const user = await storage.getUserById(req.userId!);
      if (order.sellerId !== req.userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedOrder = await storage.updateOrder(id, { 
        sellerApproval: approval,
        fulfillmentStatus: approval === 'approved' ? 'seller_approved' : 'order_received',
        status: approval === 'rejected' ? 'rejected' : order.status
      });

      if (approval === 'approved') {
        try {
          const { notifyBuyerOfOrderApproval } = await import('./notifications');
          const buyer = await storage.getUserById(order.buyerId);
          const product = await storage.getProductById(order.productId);
          if (buyer && product) {
            await notifyBuyerOfOrderApproval(updatedOrder, buyer, product);
          }
        } catch (err) {
          console.error('Failed to notify buyer of seller approval:', err);
        }
      }

      // Notify Admin
      const adminUsers = await storage.getAdminUsers();
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendLocalEmail(admin.email, 'Order Approved by Seller', `
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
        await sendLocalEmail(order.buyer.email, 'Order Confirmed!', `
          <h1>Your order #${id} has been confirmed!</h1>
          <p>Estimated Delivery: ${new Date(estimatedDeliveryDate).toLocaleDateString()}</p>
          <p>A Kaydem Logistics agent will be assigned to your delivery.</p>
        `);

        // Notify Seller
        await sendLocalEmail(order.seller.email, 'Order Confirmed by Hub', `
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
        await sendLocalEmail(order.buyer.email, 'Thank You!', `<h1>Thank you for shopping with us!</h1><p>Your order #${id} has been successfully delivered and confirmed.</p>`);
        
        // Notify Seller and Admin of success
        await sendLocalEmail(order.seller.email, 'Delivery Successful!', `<p>Order #${id} has been confirmed by the buyer. Your payout is pending admin approval.</p>`);
      } else {
        // Notify Seller and Admin of rejection
        const adminUsers = await storage.getAdminUsers();
        const notificationMsg = `<h1>Order #${id} Rejected</h1><p>The buyer has rejected the product for order #${id}. Please investigate.</p>`;
        
        await sendLocalEmail(order.seller.email, 'Order Rejected by Buyer', notificationMsg);
        for (const admin of adminUsers) {
          if (admin.email) await sendLocalEmail(admin.email, 'Order Rejection Alert', notificationMsg);
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

      const idScanUrl = files.idScan ? await saveFile(files.idScan[0]) : undefined;
      const idScanUrlBack = files.idScanBack ? await saveFile(files.idScanBack[0]) : undefined;
      const faceScanUrl = files.faceScan ? await saveFile(files.faceScan[0]) : undefined;

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
          await sendLocalEmail(admin.email, 'New Seller Verification Request', `
            <h1>New Verification Request</h1>
            <p>User ID: ${req.userId}</p>
            <p>Verification Type: ${sellerVerificationType}</p>
            <p>Please check the admin dashboard for details.</p>
          `);
        }
      }
      
      await notifyAdminOfVerificationRequest('Seller', req.userId!);

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
      
      const pendingLogoUrl = await saveFile(req.file);
      await storage.updateStore(storeId, { pendingLogoUrl });
      
      // Notify Admin
      const adminUsers = await storage.getAdminUsers();
      for (const admin of adminUsers) {
        if (admin.email) {
          await sendLocalEmail(admin.email, 'Store Logo Change Request', `
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
    { name: 'buyerIdScanBack', maxCount: 1 },
    { name: 'buyerFaceScan', maxCount: 1 },
    { name: 'guardianIdScan', maxCount: 1 },
    { name: 'guardianFaceWithId', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { latitude, longitude } = req.body;

      if (!files || !files.buyerIdScan) {
        return res.status(400).json({ message: "Buyer ID scan is required" });
      }

      const buyerIdScanUrl = await saveFile(files.buyerIdScan[0]);
      const buyerIdScanBackUrl = files.buyerIdScanBack ? await saveFile(files.buyerIdScanBack[0]) : undefined;
      const buyerFaceScanUrl = files.buyerFaceScan ? await saveFile(files.buyerFaceScan[0]) : undefined;
      const guardianIdUrl = files.guardianIdScan ? await saveFile(files.guardianIdScan[0]) : undefined;
      const guardianFaceWithIdUrl = files.guardianFaceWithId ? await saveFile(files.guardianFaceWithId[0]) : undefined;

      // Update buyer verification documents if user is logged in
      if (req.userId) {
        await storage.updateUser(req.userId, {
          buyerIdScanUrl,
          buyerFaceScanUrl,
          buyerLatitude: latitude,
          buyerLongitude: longitude,
          buyerVerifiedAt: new Date()
        });
        await notifyAdminOfVerificationRequest('Buyer Installment', req.userId);
      } else {
        // For guests, we notify with a generic message (order creation will provide more details later)
        await notifyAdminOfVerificationRequest('Guest Buyer Installment', 0);
      }

      res.json({
        buyerIdScanUrl,
        buyerIdScanBackUrl,
        buyerFaceScanUrl,
        guardianIdUrl,
        guardianFaceWithIdUrl,
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

  // EMERGENCY DB SYNC ROUTE
  app.post("/api/admin/db-sync-emergency", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log("Starting emergency DB sync on production...");
      const { sql } = await import('drizzle-orm');
      
      // 1. Make media_gif_url optional
      await db.execute(sql`ALTER TABLE products ALTER COLUMN media_gif_url DROP NOT NULL;`);
      console.log("Successfully made media_gif_url optional.");

      // 2. Add is_installment_eligible if missing
      try {
        await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_installment_eligible BOOLEAN DEFAULT true NOT NULL;`);
        console.log("Successfully added is_installment_eligible column.");
      } catch (e) {
        console.log("Note: is_installment_eligible column might already exist.");
      }
      
      res.json({ message: "Production database schema updated successfully." });
    } catch (error) {
      console.error("Emergency DB sync failed:", error);
      res.status(500).json({ message: "Emergency DB sync failed", error: String(error) });
    }
  });
  app.post("/api/admin/db-sync", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log("Starting emergency DB sync...");
      // In a real app we'd use migrations, but for this setup we'll try to use drizzle-kit logic or raw SQL
      // For now, let's just log that we reached it.
      res.json({ message: "DB sync endpoint reached. Manual schema update required on Cloud SQL." });
    } catch (error) {
      console.error("DB sync error:", error);
      res.status(500).json({ message: "DB sync failed", error: String(error) });
    }
  });

  // Product image upload with AI Watermarking
  app.post("/api/upload/product", authenticateToken, imageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const extension = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      const wmFileName = `wm_${fileName}`;
      let finalBuffer: Buffer;

      console.log(`Processing product upload: ${fileName}, mimetype: ${req.file.mimetype}`);

      if (req.file.mimetype.startsWith('image/')) {
        // AI Watermarking using Sharp for images
        const image = sharp(req.file.buffer);
        
        // Set a timeout for Sharp processing to prevent hangs
        const processingPromise = (async () => {
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

          return await image
            .composite([{ input: watermarkText, top: 0, left: 0 }])
            .toBuffer();
        })();

        // 30 second timeout for image processing
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Image processing timed out")), 30000)
        );

        finalBuffer = await Promise.race([processingPromise, timeoutPromise]) as Buffer;
        console.log(`Successfully watermarked image: ${wmFileName}`);
      } else {
        // For videos or other files, skip watermarking
        finalBuffer = req.file.buffer;
        console.log(`Successfully processed non-image file: ${wmFileName}`);
      }

      // Save the final buffer
      let finalUrl: string;
      if (process.env.GAE_ENV || process.env.NODE_ENV === 'production') {
        finalUrl = await uploadToGCS(finalBuffer, wmFileName, req.file.mimetype);
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }
        const filePath = path.join(uploadsDir, wmFileName);
        await fs.promises.writeFile(filePath, finalBuffer);
        finalUrl = `/uploads/${wmFileName}`;
      }
      
      res.json({ url: finalUrl });
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

      const idScanUrl = await saveFile(files.idScan[0]);
      const faceScanUrl = await saveFile(files.faceScan[0]);

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

  // Bookmark routes
  app.get("/api/bookmarks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bookmarks = await storage.getBookmarksByUserId(req.userId!);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/bookmarks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bookmarkData = { ...req.body, userId: req.userId! };
      const bookmark = await storage.createBookmark(bookmarkData);
      res.json(bookmark);
    } catch (error) {
      res.status(500).json({ message: "Failed to create bookmark" });
    }
  });

  app.delete("/api/bookmarks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBookmark(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bookmark" });
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
      console.log("Creating new product with data:", JSON.stringify(req.body, null, 2));
      const productData = insertProductSchema.parse(req.body);
      
      // Verify user owns the store
      const store = await storage.getStoreById(productData.storeId);
      if (!store) {
        console.error(`Store not found: ${productData.storeId}`);
        return res.status(404).json({ message: "Store not found" });
      }
      
      if (store.userId !== req.userId && !req.user?.isAdmin) {
        console.error(`User ${req.userId} (isAdmin: ${req.user?.isAdmin}) attempted to create product for store ${productData.storeId} owned by ${store.userId}`);
        return res.status(403).json({ message: "Cannot create product for another user's store" });
      }

      const product = await storage.createProduct(productData);
      console.log(`Product created successfully: ${product.id}`);
      res.json(product);
      } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({
        message: "Invalid product data or creation failed",
        error: error instanceof Error ? error.message : String(error),
        details: error
      });
      }
      });

      app.put("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
      try {
      const id = parseInt(req.params.id);
      const productData = req.body;

      const existingProduct = await storage.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStoreById(existingProduct.storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.userId !== req.userId && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Cannot update another user's product" });
      }

      const product = await storage.updateProduct(id, productData);
      res.json(product);
      } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
      }
      });

      app.get("/api/products", async (req, res) => {    try {
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
      console.error("GET /api/products error:", error);
      res.status(500).json({ message: "Failed to fetch products", error: String(error) });
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
      const { 
        cartItems, paymentMode, isBokoo, details, totalAmount, codFee, shippingMode, shippingFee,
        verificationType, verificationOccupation, verificationSalary, verificationIdType,
        verificationIdFrontUrl, verificationIdBackUrl, guardianName, guardianOccupation,
        guardianSalary, guardianPhone, guardianIdUrl, guardianFaceWithIdUrl
      } = req.body;
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
          paymentGateway: 'manual',
          shippingMode: (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
          fulfillmentStatus: 'order_received',
          buyerAddress: details?.address || '',
          buyerUniversity: details?.university || '',
          buyerPhone: details?.phoneNumber || '',
          buyerEmail: details?.email || '',
          isInstallment: isBokoo,
          
          // Verification details
          verificationType,
          verificationOccupation,
          verificationSalary,
          verificationIdType,
          verificationIdFrontUrl,
          verificationIdBackUrl,
          guardianName,
          guardianOccupation,
          guardianSalary,
          guardianPhone,
          guardianIdUrl,
          guardianFaceWithIdUrl
        });
        createdOrders.push(order);
      }

      // Send confirmation emails
      try {
        const { sendPurchaseConfirmationEmail } = await import('./email');
        const { sendOrderConfirmation, notifySellerOfNewOrder, notifyAdminOfNewOrder, notifyAdminViaWhatsApp } = await import('./notifications');
        const trackingUrl = `${process.env.APP_URL || 'https://uniexchangehub.com'}/gh/orders`;
        const buyerName = details ? `${details.firstName} ${details.lastName}` : "Customer";
        
        // 1. Send "Thank You" with tracking to Buyer
        await sendPurchaseConfirmationEmail(
          details?.email || '',
          buyerName,
          createdOrders[0]?.id || 0,
          (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
          trackingUrl,
          paymentMode === 'cod',
          totalAmount ? totalAmount.toString() : "0"
        );

        // 2. Notify Seller & Admin for each order
        for (const order of createdOrders) {
          const product = await storage.getProductById(order.productId);
          if (!product) continue;
          const seller = await storage.getUserById(order.sellerId);
          
          // Notify Seller
          if (seller) {
            await notifySellerOfNewOrder(order, seller, product);
          }

          // Notify Admin
          const admins = await storage.getAdminUsers();
          for (const admin of admins) {
            if (admin.email) {
              await notifyAdminOfNewOrder(order, admin.email, product, seller || { username: 'Unknown', email: 'N/A' });
            }
          }
          
          await notifyAdminViaWhatsApp(`New Manual Order #${order.id} for ${product.title} - GH₵${parseFloat(order.totalAmount).toFixed(2)}`);
        }
      } catch (err) {
        console.error('Failed to send order notifications:', err);
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
      const { status, feedback } = req.body; // verified, rejected, needs_correction

      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (status === 'rejected') {
        // Send rejection email first
        await sendLocalEmail(user.email, 'Seller Application Rejected - The University Hub', `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #e11d48;">Application Rejected</h2>
            <p>Hi ${user.firstName},</p>
            <p>We regret to inform you that your seller application for The University Hub has been rejected.</p>
            ${feedback ? `<p><strong>Reason:</strong> ${feedback}</p>` : ''}
            <p>Your account has been removed from our system. You may try to register again in the future with valid information.</p>
          </div>
        `);

        await storage.deleteUser(id);
        return res.json({ success: true, message: "User rejected and deleted" });
      }

      const updatedUser = await storage.updateUser(id, {
        verificationStatus: status,
        verificationNotes: feedback,
        verifiedAt: status === 'verified' ? new Date() : null
      });

      if (status === 'verified') {
        await sendLocalEmail(user.email, 'Seller Application Approved! - The University Hub', `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #059669;">Welcome Aboard!</h2>
            <p>Hi ${user.firstName},</p>
            <p>Congratulations! Your seller application for The University Hub has been approved.</p>
            <p>You now have full access to our seller tools and can start launching your products.</p>
            <div style="margin: 20px 0;">
              <a href="${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            </div>
          </div>
        `);

        try {
          const { uploadVerificationToDrive } = await import('./google-drive');
          uploadVerificationToDrive(updatedUser!).catch((err: Error) => console.error('Drive backup failed:', err));
        } catch (e) {
          console.error('Failed to import google-drive service:', e);
        }
      } else if (status === 'needs_correction') {
        await sendLocalEmail(user.email, 'Action Required: Seller Application Correction - The University Hub', `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #d97706;">Action Required</h2>
            <p>Hi ${user.firstName},</p>
            <p>Your seller application requires some corrections before we can proceed with approval.</p>
            <p><strong>Notes from Admin:</strong> ${feedback || 'Please review your uploaded documents.'}</p>
            <p>Please log in to your dashboard to update your information and resubmit.</p>
            <div style="margin: 20px 0;">
              <a href="${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard" style="background: #d97706; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update My Information</a>
            </div>
          </div>
        `);
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Verification update error:', error);
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
          channels: ["mobile_money", "card", "bank"],
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
          await sendLocalEmail(seller.email, subject, html);
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
            uploadVerificationToDrive(user).catch((err: Error) => console.error('Drive backup failed:', err));
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
        await sendLocalEmail(seller.email, subject, html);
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
          await sendLocalEmail(seller.email, subject, html);
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
        await sendLocalEmail(seller.email, subject, html);
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
          await sendLocalEmail(seller.email, subject, html);
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

      if (!['pending', 'approved', 'rejected', 'archived'].includes(status)) {
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

  app.put("/api/admin/products/:id/availability", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { isAvailable } = req.body;

      const product = await storage.updateProduct(productId, { isAvailable });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product availability" });
    }
  });

  app.post("/api/admin/products", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { storeId, categoryId, title, description, price, originalPrice, condition, images, specialOffer, mediaGifUrl } = req.body;

      // Validate required fields (storeId can be -1 for "All Stores")
      if (storeId === undefined || !categoryId || !title || !description || !price || !condition || !images || images.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (storeId === -1) {
        // Broadcast to all stores
        const allStores = await storage.getAllStoresForAdmin();
        if (allStores.length === 0) {
          return res.status(404).json({ message: "No stores found to broadcast to" });
        }

        const productPromises = allStores.map(async (s) => {
          const newProduct = await storage.createProduct({
            storeId: s.id,
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
          return storage.updateProductApprovalStatus(newProduct.id, 'approved');
        });

        const createdProducts = await Promise.all(productPromises);
        return res.json({ 
          message: `Successfully broadcasted to ${createdProducts.length} stores`,
          count: createdProducts.length,
          products: createdProducts 
        });
      }

      // Verify store exists for single store post
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
          const csvContent = req.file.buffer.toString('utf-8');
          
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
          guestDetails: guestDetails ? JSON.stringify(guestDetails) : "{}",
          buyerLatitude: buyerLocation?.latitude || "",
          buyerLongitude: buyerLocation?.longitude || "",
          verificationUrls: verificationUrls ? JSON.stringify(verificationUrls) : "{}",
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

  // SEO Routes
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nAllow: /\nSitemap: https://uniexchangehub.com/sitemap.xml");
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://uniexchangehub.com";
      const productsList = await storage.getProductsWithStore({});
      const storesList = await storage.getStoresWithUser({});

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
      
      // Add static pages
      const pages = ["", "/browse", "/about", "/contact", "/seller-auth", "/auth"];
      pages.forEach(page => {
        xml += `\n  <url><loc>${baseUrl}${page}</loc></url>`;
      });

      // Add products
      productsList.forEach(p => {
        xml += `\n  <url><loc>${baseUrl}/product/${p.id}</loc><lastmod>${new Date(p.createdAt || new Date()).toISOString().split('T')[0]}</lastmod></url>`;
        xml += `\n  <url><loc>${baseUrl}/gh/product/${p.id}</loc></url>`;
      });

      // Add stores
      storesList.forEach(s => {
        xml += `\n  <url><loc>${baseUrl}/store/${s.id}</loc></url>`;
        xml += `\n  <url><loc>${baseUrl}/gh/store/${s.id}</loc></url>`;
      });

      xml += "\n</urlset>";
      res.type("application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}