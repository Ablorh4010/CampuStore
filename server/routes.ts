import { z } from "zod";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, insertStoreSchema, insertProductSchema, 
  insertOrderSchema, insertMessageSchema, insertCartItemSchema,
  insertWeeklyDealSchema, insertCampusActivitySchema,
  users, orders, categories, products
} from "@shared/schema";
import { eq, sql, or, lt, and } from "drizzle-orm";
import multer from "multer";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { verifyFaceMatch, extractProductFromHtml, generateProductDescription, generateStoreProfile } from "./ai";
import { isWooCommerce, extractWooCommerceProduct } from "./woocommerce-service";
import { uploadToGCS } from "./gcs-storage";
import { sendEmail as sendLocalEmail, sendPurchaseConfirmationEmail } from "./email";
import crypto from 'crypto';
import { generateToken, authenticateToken, tryAuthenticate, requireAdmin, type AuthRequest } from "./auth";
import { notifyAdminOfVerificationRequest } from "./notifications";
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
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again in 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const upload = multer({ storage: multer.memoryStorage() });

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const saveFile = async (file: Express.Multer.File): Promise<string> => {
  const extension = path.extname(file.originalname);
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  if (process.env.GAE_ENV || process.env.NODE_ENV === 'production') {
    return await uploadToGCS(file.buffer, fileName, file.mimetype);
  } else {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    const filePath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    return `/uploads/${fileName}`;
  }
};

const inMemoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function createPaystackPlan(amount: number, name: string) {
  try {
    const response = await fetch('https://api.paystack.co/plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        amount: Math.round(amount * 100),
        interval: 'monthly',
        currency: 'GHS',
        invoice_limit: 3,
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
  const existingOrders = await storage.getOrdersByReference(reference);
  if (existingOrders.length > 0) return existingOrders;

  const { cartItems, userId: metaUserId, guestDetails, codFee, shippingMode, amount } = metadata;
  const userId = metaUserId ? parseInt(metaUserId) : null;
  const buyerInfo = userId ? await storage.getUserById(userId) : null;
  const buyerEmail = guestDetails?.email || customer.email || buyerInfo?.email;

  const createdOrders = [];
  for (const item of cartItems) {
    const product = await storage.getProductById(item.productId);
    if (!product) continue;
    const store = await storage.getStoreById(product.storeId);
    if (!store) continue;

    const isThisItemEligible = product.isInstallmentEligible && metadata.isBokoo;
    const itemRecurringAmount = isThisItemEligible ? (parseFloat(product.price) * item.quantity * 0.75) / 3 : 0;

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
      shippingMode: product.isDigital ? 'digital_delivery' : (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'),
      fulfillmentStatus: product.isDigital ? 'delivered' : 'order_received',
      buyerAddress: guestDetails?.address || buyerInfo?.sellerAddress || 'Provided at checkout',
      buyerUniversity: guestDetails?.university || '',
      buyerCity: guestDetails?.city || '',
      buyerEmail: buyerEmail,
      payoutStatus: 'pending',
      
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

      isInstallment: isThisItemEligible,
      installmentsPaid: isThisItemEligible ? 1 : 0,
      installmentAmount: isThisItemEligible ? itemRecurringAmount.toFixed(2) : null,
      installmentDebt: "0",
      penaltyAmount: "0",
      lastInstallmentDate: isThisItemEligible ? new Date() : null,
      nextInstallmentDate: isThisItemEligible ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) : null,
      isDefaulted: false,
      paystackAuthCode: data.authorization?.authorization_code || null,
    });
    createdOrders.push(order);
  }

  processOrderNotifications(createdOrders, guestDetails, 'paystack', shippingMode, amount, buyerEmail);
  if (userId) await storage.clearCart(userId);
  return createdOrders;
}

async function processOrderNotifications(createdOrders: any[], details: any, paymentMode: string, shippingMode: string, totalAmount: any, buyerEmail: string) {
  try {
    const { sendPurchaseConfirmationEmail } = await import('./email');
    const { sendOrderConfirmation, notifySellerOfNewOrder, notifyAdminOfNewOrder, notifyAdminViaWhatsApp } = await import('./notifications');
    const trackingUrl = `${process.env.APP_URL || 'https://uniexchangehub.com'}/gh/orders`;
    const buyerName = details ? `${details.firstName} ${details.lastName}` : "Customer";
    
    await sendPurchaseConfirmationEmail(buyerEmail || '', buyerName, createdOrders[0]?.id || 0, (shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery'), trackingUrl, paymentMode === 'cod', totalAmount ? totalAmount.toString() : "0").catch(e => console.error("Email error:", e));

    for (const order of createdOrders) {
      const product = await storage.getProductById(order.productId);
      if (!product) continue;
      const seller = await storage.getUserById(order.sellerId);
      if (seller) await notifySellerOfNewOrder(order, seller, product).catch(e => console.error("Seller notify error:", e));
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        if (admin.email) await notifyAdminOfNewOrder(order, admin.email, product, seller || { username: 'Unknown', email: 'N/A' }).catch(e => console.error("Admin notify error:", e));
      }
      await notifyAdminViaWhatsApp(`New ${paymentMode.toUpperCase()} Order #${order.id} for ${product.title} - GH₵${parseFloat(order.totalAmount).toFixed(2)}`).catch(e => console.error("WhatsApp error:", e));
    }
  } catch (err) { console.error('Background notification error:', err); }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { otpCode, ...userData } = req.body;
      const parsedUserData = insertUserSchema.parse(userData);
      const isValidOtp = await storage.verifyOtp(parsedUserData.email, otpCode);
      if (!isValidOtp) return res.status(401).json({ message: "Invalid verification code" });
      const user = await storage.createUser(parsedUserData);
      await storage.markEmailAsVerified(parsedUserData.email);
      res.json({ user: { ...user, password: undefined }, token: generateToken(user.id) });
    } catch (error) { res.status(400).json({ message: "Invalid user data" }); }
  });

  app.post("/api/auth/seller/register", authLimiter, async (req, res) => {
    try {
      const { otpCode, ...userData } = req.body;
      const isValidOtp = await storage.verifyOtp(userData.email, otpCode);
      if (!isValidOtp) return res.status(401).json({ message: "Invalid verification code" });
      const { university, businessName, city, idType, ...baseUserData } = userData;
      const sellerData = { ...baseUserData, university, city, idType, userType: 'seller', isMerchant: true };
      const parsedUserData = insertUserSchema.parse(sellerData);
      const user = await storage.createUser(parsedUserData);
      await storage.markEmailAsVerified(userData.email);
      res.json({ user: { ...user, password: undefined }, token: generateToken(user.id) });
    } catch (error) { res.status(400).json({ message: "Registration failed" }); }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password, otpCode } = req.body;
      let user = null;
      if (email && password) user = await storage.verifyPassword(email, password);
      else if (email && otpCode) {
        if (await storage.verifyOtp(email, otpCode)) user = await storage.getUserByEmail(email);
      }
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      res.json({ user: { ...user, password: undefined }, token: generateToken(user.id) });
    } catch (error) { res.status(500).json({ message: "Login failed" }); }
  });

  // Store Routes
  app.get("/api/stores/user", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const stores = await storage.getStoresByUserId(req.userId!);
      res.json(stores);
    } catch (error) { res.status(500).json({ message: "Failed to fetch stores" }); }
  });

  app.post("/api/stores", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore({ ...storeData, userId: req.userId! });
      res.json(store);
    } catch (error) { res.status(400).json({ message: "Invalid store data" }); }
  });

  // Order Routes
  app.post("/api/orders", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { cartItems, paymentMode, isBokoo, details, totalAmount, codFee, shippingMode, shippingFee, ...vData } = req.body;
      const createdOrders = [];
      for (const item of cartItems) {
        const productWithStore = await storage.getProductWithStore(item.productId);
        if (!productWithStore) continue;
        const itemTotal = (parseFloat(productWithStore.price) * item.quantity).toString();
        const order = await storage.createOrder({
          buyerId: req.userId || 1,
          sellerId: productWithStore.store.userId,
          productId: item.productId,
          quantity: item.quantity,
          totalAmount: itemTotal,
          codFee: codFee ? (parseFloat(codFee.toString()) / cartItems.length).toFixed(2) : null,
          status: 'pending',
          paymentGateway: 'manual',
          shippingMode: shippingMode === 'ghana_post_ems' ? 'ems' : 'express_delivery',
          fulfillmentStatus: 'order_received',
          buyerAddress: details?.address || '',
          buyerUniversity: details?.university || '',
          buyerCity: details?.city || '',
          buyerPhone: details?.phoneNumber || '',
          buyerEmail: details?.email || '',
          isInstallment: isBokoo,
          ...vData
        });
        createdOrders.push(order);
      }
      res.json({ message: "Order placed", orders: createdOrders });
      processOrderNotifications(createdOrders, details, paymentMode, shippingMode, totalAmount, details?.email || '');
    } catch (error) { res.status(500).json({ message: "Order failed" }); }
  });

  app.get("/api/orders/seller/:sellerId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orders = await storage.getOrdersBySellerId(parseInt(req.params.sellerId));
      res.json(orders);
    } catch (error) { res.status(500).json({ message: "Failed to fetch orders" }); }
  });

  // Admin Routes
  app.get("/api/admin/orders/pending", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allOrders = await db.select().from(orders).where(or(eq(orders.sellerApproval, 'pending'), eq(orders.adminApproval, 'pending')));
      const details = [];
      for (const o of allOrders) {
        const d = await storage.getOrderWithDetails(o.id);
        if (d && d.status !== 'rejected' && d.status !== 'cancelled') details.push(d);
      }
      res.json(details);
    } catch (error) { res.status(500).json({ message: "Failed to fetch orders" }); }
  });

  app.put("/api/orders/:id/seller-approval", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { approval } = req.body;
      const order = await storage.getOrderById(parseInt(req.params.id));
      const user = await storage.getUserById(req.userId!);
      if (!order || (order.sellerId !== req.userId && !user?.isAdmin)) return res.status(403).json({ message: "Unauthorized" });
      const updatedOrder = await storage.updateOrder(order.id, { 
        sellerApproval: approval,
        fulfillmentStatus: approval === 'approved' ? 'seller_approved' : 'order_received'
      });
      res.json(updatedOrder);
    } catch (error) { res.status(500).json({ message: "Approval failed" }); }
  });

  app.get("/api/admin/config/:key", async (req, res) => {
    const value = await storage.getAppConfig(req.params.key);
    res.json({ value });
  });

  app.post("/api/admin/config", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    await storage.setAppConfig(req.body.key, req.body.value);
    res.json({ success: true });
  });

  // Verification Upload
  app.post("/api/upload/buyer-verification", apiLimiter, tryAuthenticate, imageUpload.fields([
    { name: 'buyerIdScan', maxCount: 1 }, { name: 'buyerIdScanBack', maxCount: 1 },
    { name: 'buyerFaceScan', maxCount: 1 }, { name: 'guardianIdScan', maxCount: 1 },
    { name: 'guardianFaceWithId', maxCount: 1 }
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as any;
      const urls: any = { buyerIdScanUrl: await saveFile(files.buyerIdScan[0]) };
      if (files.buyerIdScanBack) urls.buyerIdScanUrlBack = await saveFile(files.buyerIdScanBack[0]);
      if (files.buyerFaceScan) urls.buyerFaceScanUrl = await saveFile(files.buyerFaceScan[0]);
      if (req.userId) {
        await storage.updateUser(req.userId, { ...urls, buyerVerifiedAt: new Date() });
        await notifyAdminOfVerificationRequest('Buyer Installment', req.userId);
      }
      res.json({ ...urls, message: "Uploaded" });
    } catch (error) { res.status(500).json({ message: "Upload failed" }); }
  });

  // Paystack Initialize
  app.post("/api/paystack/initialize", tryAuthenticate, async (req: AuthRequest, res) => {
    try {
      const { amount, email, metadata } = req.body;
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100), email, currency: "GHS", channels: ["mobile_money", "card", "bank"], metadata })
      });
      const data = await response.json();
      res.json(data.data);
    } catch (error) { res.status(500).json({ message: "Payment init failed" }); }
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
      let xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">`;
      ["", "/browse", "/about", "/contact"].forEach(p => xml += `\n  <url><loc>${baseUrl}${p}</loc></url>`);
      productsList.forEach(p => xml += `\n  <url><loc>${baseUrl}/product/${p.id}</loc></url>`);
      xml += "\n</urlset>";
      res.type("application/xml").send(xml);
    } catch (error) { res.status(500).send("Sitemap error"); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
