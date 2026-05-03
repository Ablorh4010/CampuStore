import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  university: text("university"),
  campus: text("campus"),
  city: text("city"),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  phoneNumber: text("phone_number").unique(),
  whatsappNumber: text("whatsapp_number").unique(), // For WhatsApp OTP
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
  isWhatsappVerified: boolean("is_whatsapp_verified").notNull().default(false),
  isMerchant: boolean("is_merchant").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  userType: text("user_type").notNull().default("buyer"), // buyer, seller, admin
  password: text("password"),
  avatar: text("avatar"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  
  // Payment details
  paymentMethod: text("payment_method"), // bank, paypal, mobile_money
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  accountHolderName: text("account_holder_name"),
  paypalUserId: text("paypal_user_id"),
  mobileMoneyProvider: text("mobile_money_provider"),
  mobileMoneyPhone: text("mobile_money_phone"),
  
  // Seller verification
  verificationStatus: text("verification_status").notNull().default("unverified"), // unverified, pending, verified, rejected, needs_correction
  idType: text("id_type"), // passport, national_id, driving_license
  idScanUrl: text("id_scan_url"),
  idScanUrlBack: text("id_scan_url_back"),
  faceScanUrl: text("face_scan_url"),
  dateOfBirth: timestamp("date_of_birth"),
  sellerLatitude: text("seller_latitude"),
  sellerLongitude: text("seller_longitude"),
  sellerAddress: text("seller_address"),
  whatsappBusinessNumber: text("whatsapp_business_number"),
  socialMediaPresence: text("social_media_presence"),
  sellerVerificationType: text("seller_verification_type"), // student, business
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  
  // Buyer verification (for checkout)
  buyerIdScanUrl: text("buyer_id_scan_url"),
  buyerFaceScanUrl: text("buyer_face_scan_url"),
  buyerLatitude: text("buyer_latitude"),
  buyerLongitude: text("buyer_longitude"),
  buyerVerifiedAt: timestamp("buyer_verified_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"), // Store profile picture
  pendingLogoUrl: text("pending_logo_url"), // For admin approval
  university: text("university"),
  campus: text("campus"),
  city: text("city").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  approvalStatus: text("approval_status").notNull().default("pending"), // pending, approved, rejected
  
  // Shipping and location details
  address: text("address"), // Full address
  latitude: text("latitude"),
  longitude: text("longitude"),
  shippingModes: text("shipping_modes").array(), // ["seller_delivery", "affordcampus_pickup", "ems", "ghana_post_standard", "express_delivery"]
  deliveryRadius: integer("delivery_radius"), // in km for seller delivery
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  parentId: integer("parent_id"), // For sub-categories
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  image: text("image"),
  price: text("price"),
  category: text("category"),
  status: text("status").notNull().default("pending"), // pending, imported, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  images: text("images").array().notNull(), // At most 8 images
  mediaGifUrl: text("media_gif_url"), // Optional short quality GIF/Video
  specialOffer: text("special_offer"),
  stockQuantity: integer("stock_quantity").notNull().default(1),
  sizes: text("sizes"), // e.g. "S,M,L" or "40,41,42"
  isAvailable: boolean("is_available").notNull().default(true),
  approvalStatus: text("approval_status").notNull().default("pending"), // pending, approved, rejected
  viewCount: integer("view_count").notNull().default(0),
  isInstallmentEligible: boolean("is_installment_eligible").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  codFee: decimal("cod_fee", { precision: 10, scale: 2 }), // 10% fee for COD
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled, rejected
  sellerApproval: text("seller_approval").notNull().default("pending"), // pending, approved, rejected
  adminApproval: text("admin_approval").notNull().default("pending"), // pending, approved, rejected
  fulfillmentStatus: text("fulfillment_status").notNull().default("order_received"), // order_received, seller_approved, admin_approved, logistics_handover, in_transit, delivered, confirmed
  deliveryStatus: text("delivery_status").default("pending"), 
  shippingMode: text("shipping_mode"), // seller_delivery, affordcampus_pickup, ems, ghana_post_standard, express_delivery
  shippingStatus: text("shipping_status").default("pending"),
  trackingNumber: text("tracking_number"),
  paymentReference: text("payment_reference"),
  paymentGateway: text("payment_gateway").default("stripe"), // stripe, paystack, manual
  carrier: text("carrier"), // Ghana Post, FedEx, etc.
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  trackingHistory: text("tracking_history"), // Text summary of updates
  buyerConfirmation: text("buyer_confirmation"), // received, rejected
  buyerConfirmationAt: timestamp("buyer_confirmation_at"),
  buyerLatitude: text("buyer_latitude"),
  buyerLongitude: text("buyer_longitude"),
  buyerAddress: text("buyer_address"),
  buyerUniversity: text("buyer_university"),
  buyerCity: text("buyer_city"),
  buyerPhone: text("buyer_phone"),
  buyerEmail: text("buyer_email"),
  payoutStatus: text("payout_status").default("pending"), // pending, processed, cancelled
  payoutProcessedAt: timestamp("payout_processed_at"),
  
  // Installment fields
  isInstallment: boolean("is_installment").notNull().default(false),
  installmentsPaid: integer("installments_paid").notNull().default(0),
  installmentAmount: decimal("installment_amount", { precision: 10, scale: 2 }),
  nextInstallmentDate: timestamp("next_installment_date"),
  paystackAuthCode: text("paystack_auth_code"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull().references(() => users.id),
  toId: integer("to_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email"),
  phoneNumber: text("phone_number"), // For WhatsApp OTP
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  otpType: text("otp_type").notNull().default("email"), // email or whatsapp
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Events calendar for clubs and organizations
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").notNull().references(() => users.id),
  clubId: integer("club_id").references(() => clubs.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  image: text("image"),
  eventType: text("event_type").notNull().default("general"), // general, sale, meetup, workshop
  isPublic: boolean("is_public").notNull().default(true),
  maxAttendees: integer("max_attendees"),
  university: text("university"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Event RSVPs/registrations
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("attending"), // attending, interested, declined
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Clubs and organizations
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logo: text("logo"),
  coverImage: text("cover_image"),
  university: text("university").notNull(),
  category: text("category").notNull(), // academic, social, sports, arts, tech
  isVerified: boolean("is_verified").notNull().default(false),
  memberCount: integer("member_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Club memberships
export const clubMemberships = pgTable("club_memberships", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Auctions/Bidding system
export const auctions = pgTable("auctions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull(),
  currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
  reservePrice: decimal("reserve_price", { precision: 10, scale: 2 }),
  buyNowPrice: decimal("buy_now_price", { precision: 10, scale: 2 }),
  highestBidderId: integer("highest_bidder_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("active"), // active, ended, sold, cancelled
  bidCount: integer("bid_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Auction bids
export const auctionBids = pgTable("auction_bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctions.id),
  bidderId: integer("bidder_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isWinning: boolean("is_winning").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Study groups
export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  course: text("course").notNull(), // Course code or name
  university: text("university").notNull(),
  maxMembers: integer("max_members").notNull().default(10),
  memberCount: integer("member_count").notNull().default(1),
  meetingSchedule: text("meeting_schedule"),
  meetingLocation: text("meeting_location"),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Study group memberships
export const studyGroupMemberships = pgTable("study_group_memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => studyGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // creator, member
  status: text("status").notNull().default("active"), // active, pending, removed
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// User follows (social connections)
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Seller reviews
export const sellerReviews = pgTable("seller_reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gamification - Badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(), // buyer, seller, community
  requirement: text("requirement").notNull(), // Description of how to earn
  points: integer("points").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User badges
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Gamification points/rewards
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  level: integer("level").notNull().default(1),
  streak: integer("streak").notNull().default(0), // Daily activity streak
  lastActivityAt: timestamp("last_activity_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Points history/transactions
export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  reason: text("reason").notNull(), // purchase, sale, review, referral, etc.
  referenceId: integer("reference_id"), // ID of related entity
  referenceType: text("reference_type"), // order, review, badge, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Weekly Deals for the front page
export const weeklyDeals = pgTable("weekly_deals", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  discountPercentage: integer("discount_percentage"),
  dealLabel: text("deal_label").notNull().default("Flash Deal"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Campus Activity Feed
export const campusActivity = pgTable("campus_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Nullable for external news
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull().default("internal"), // internal, google, facebook
  activityType: text("activity_type").notNull().default("news"), // news, activity, sale
  externalLink: text("external_link"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., 'admin_momo_number'
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  isWhatsappVerified: true,
  isAdmin: true,
}).extend({
  campus: z.string().nullable().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phoneNumber: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).nullable().optional(),
  sellerAddress: z.string().nullable().optional(),
  userType: z.enum(['buyer', 'seller', 'admin']).optional(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  rating: true,
  reviewCount: true,
  isActive: true,
  approvalStatus: true,
  createdAt: true,
}).extend({
  campus: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  shippingModes: z.array(z.enum(['seller_delivery', 'affordcampus_pickup', 'ems', 'ghana_post_standard', 'express_delivery'])).nullable().optional(),
  deliveryRadius: z.number().nullable().optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  viewCount: true,
  approvalStatus: true,
  createdAt: true,
}).extend({
  price: z.coerce.string().min(1, "Price is required"),
  originalPrice: z.coerce.string().optional().nullable(),
  images: z.array(z.string()).max(8, "Maximum 8 images allowed per listing"),
  mediaGifUrl: z.string().optional(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
}).extend({
  estimatedDeliveryDate: z.string().or(z.date()).nullable().optional(),
  buyerLatitude: z.string().nullable().optional(),
  buyerLongitude: z.string().nullable().optional(),
  buyerAddress: z.string().nullable().optional(),
  buyerUniversity: z.string().nullable().optional(),
  buyerCity: z.string().nullable().optional(),
  buyerPhone: z.string().nullable().optional(),
  buyerEmail: z.string().nullable().optional(),
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

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  isVerified: true,
  memberCount: true,
  createdAt: true,
});

export const insertClubMembershipSchema = createInsertSchema(clubMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertAuctionSchema = createInsertSchema(auctions).omit({
  id: true,
  currentBid: true,
  highestBidderId: true,
  bidCount: true,
  status: true,
  createdAt: true,
}).extend({
  startingPrice: z.coerce.string().min(1, "Starting price is required"),
  reservePrice: z.coerce.string().optional().nullable(),
  buyNowPrice: z.coerce.string().optional().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export const insertAuctionBidSchema = createInsertSchema(auctionBids).omit({
  id: true,
  isWinning: true,
  createdAt: true,
});

export const insertStudyGroupSchema = createInsertSchema(studyGroups).omit({
  id: true,
  memberCount: true,
  createdAt: true,
});

export const insertStudyGroupMembershipSchema = createInsertSchema(studyGroupMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export const insertSellerReviewSchema = createInsertSchema(sellerReviews).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyDealSchema = createInsertSchema(weeklyDeals).omit({
  id: true,
  createdAt: true,
});

export const insertCampusActivitySchema = createInsertSchema(campusActivity).omit({
  id: true,
  createdAt: true,
});

export const insertAppConfigSchema = createInsertSchema(appConfig);

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
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
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;

export type Club = typeof clubs.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type ClubMembership = typeof clubMemberships.$inferSelect;
export type InsertClubMembership = z.infer<typeof insertClubMembershipSchema>;

export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = z.infer<typeof insertAuctionBidSchema>;

export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type StudyGroupMembership = typeof studyGroupMemberships.$inferSelect;
export type InsertStudyGroupMembership = z.infer<typeof insertStudyGroupMembershipSchema>;

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type SellerReview = typeof sellerReviews.$inferSelect;
export type InsertSellerReview = z.infer<typeof insertSellerReviewSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;

export type WeeklyDeal = typeof weeklyDeals.$inferSelect;
export type InsertWeeklyDeal = z.infer<typeof insertWeeklyDealSchema>;
export type CampusActivity = typeof campusActivity.$inferSelect;
export type InsertCampusActivity = z.infer<typeof insertCampusActivitySchema>;

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;

// Extended types for API responses
export type ProductWithStore = Product & {
  store: Store & { user: Pick<User, 'firstName' | 'lastName' | 'avatar'> };
  category: Category;
};

export type WeeklyDealWithProduct = WeeklyDeal & {
  product: ProductWithStore;
};

export type CampusActivityWithUser = CampusActivity & {
  user?: Pick<User, 'firstName' | 'lastName' | 'avatar'>;
};

export type StoreWithUser = Store & {
  user: Pick<User, 'firstName' | 'lastName' | 'avatar' | 'email' | 'phoneNumber' | 'idScanUrl' | 'faceScanUrl'>;
  productCount: number;
};

export type OrderWithDetails = Order & {
  product: Product & { category: Category };
  buyer: Pick<User, 'firstName' | 'lastName' | 'email'>;
  seller: Pick<User, 'firstName' | 'lastName' | 'email'>;
};

export type CartItemWithProduct = CartItem & {
  product: ProductWithStore;
};
