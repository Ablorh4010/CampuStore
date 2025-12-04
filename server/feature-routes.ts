/**
 * Extended Feature Routes
 * Handles Events, Clubs, Auctions, Study Groups, Social, and Gamification
 */
import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import {
  events, eventRsvps, clubs, clubMemberships, auctions, auctionBids,
  studyGroups, studyGroupMemberships, userFollows, sellerReviews,
  badges, userBadges, userPoints, pointsHistory,
  insertEventSchema, insertClubSchema, insertAuctionSchema, 
  insertStudyGroupSchema, insertSellerReviewSchema
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { authenticateToken, type AuthRequest } from "./auth";
import rateLimit from "express-rate-limit";

// Rate limiter for feature routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

export function registerFeatureRoutes(app: Express) {
  
  // Apply rate limiter to all feature routes
  app.use('/api/events', apiLimiter);
  app.use('/api/clubs', apiLimiter);
  app.use('/api/auctions', apiLimiter);
  app.use('/api/study-groups', apiLimiter);
  app.use('/api/badges', apiLimiter);
  app.use('/api/leaderboard', apiLimiter);
  app.use('/api/users', apiLimiter);
  app.use('/api/sellers', apiLimiter);
  
  // ============================================
  // EVENT CALENDAR ROUTES
  // ============================================

  // Get all events (with optional filters)
  app.get("/api/events", async (req, res) => {
    try {
      const { university, startDate, endDate, type } = req.query;
      
      let query = db.select().from(events).orderBy(desc(events.startDate));
      
      const allEvents = await query;
      
      // Filter in memory for simplicity
      let filtered = allEvents;
      if (university) {
        filtered = filtered.filter(e => e.university === university);
      }
      if (startDate) {
        filtered = filtered.filter(e => new Date(e.startDate) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(e => !e.endDate || new Date(e.endDate) <= new Date(endDate as string));
      }
      if (type) {
        filtered = filtered.filter(e => e.eventType === type);
      }
      
      res.json(filtered);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [event] = await db.select().from(events).where(eq(events.id, id));
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get RSVP count
      const rsvps = await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, id));
      
      res.json({
        ...event,
        attendeeCount: rsvps.filter(r => r.status === 'attending').length,
        interestedCount: rsvps.filter(r => r.status === 'interested').length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create event
  app.post("/api/events", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        organizerId: req.userId
      });
      
      const [newEvent] = await db.insert(events).values(eventData).returning();
      res.json(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // RSVP to event
  app.post("/api/events/:id/rsvp", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['attending', 'interested', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Invalid RSVP status" });
      }

      // Check for existing RSVP
      const existing = await db.select().from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, req.userId!)));

      if (existing.length > 0) {
        // Update existing
        const [updated] = await db.update(eventRsvps)
          .set({ status })
          .where(eq(eventRsvps.id, existing[0].id))
          .returning();
        return res.json(updated);
      }

      // Create new
      const [rsvp] = await db.insert(eventRsvps).values({
        eventId,
        userId: req.userId!,
        status
      }).returning();
      
      res.json(rsvp);
    } catch (error) {
      res.status(500).json({ message: "Failed to RSVP" });
    }
  });

  // ============================================
  // CLUB/ORGANIZATION ROUTES
  // ============================================

  // Get all clubs
  app.get("/api/clubs", async (req, res) => {
    try {
      const { university, category } = req.query;
      
      let allClubs = await db.select().from(clubs).orderBy(desc(clubs.memberCount));
      
      if (university) {
        allClubs = allClubs.filter(c => c.university === university);
      }
      if (category) {
        allClubs = allClubs.filter(c => c.category === category);
      }
      
      res.json(allClubs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  // Get single club with details
  app.get("/api/clubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
      
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      
      // Get club events
      const clubEvents = await db.select().from(events)
        .where(eq(events.clubId, id))
        .orderBy(desc(events.startDate))
        .limit(5);
      
      res.json({ ...club, upcomingEvents: clubEvents });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club" });
    }
  });

  // Create club
  app.post("/api/clubs", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clubData = insertClubSchema.parse({
        ...req.body,
        ownerId: req.userId
      });
      
      const [newClub] = await db.insert(clubs).values(clubData).returning();
      
      // Auto-add creator as owner member
      await db.insert(clubMemberships).values({
        clubId: newClub.id,
        userId: req.userId!,
        role: 'owner'
      });
      
      res.json(newClub);
    } catch (error) {
      console.error('Error creating club:', error);
      res.status(400).json({ message: "Invalid club data" });
    }
  });

  // Join club
  app.post("/api/clubs/:id/join", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clubId = parseInt(req.params.id);
      
      // Check if already member
      const existing = await db.select().from(clubMemberships)
        .where(and(eq(clubMemberships.clubId, clubId), eq(clubMemberships.userId, req.userId!)));

      if (existing.length > 0) {
        return res.status(400).json({ message: "Already a member" });
      }

      const [membership] = await db.insert(clubMemberships).values({
        clubId,
        userId: req.userId!,
        role: 'member'
      }).returning();

      // Update member count
      await db.update(clubs)
        .set({ memberCount: sql`${clubs.memberCount} + 1` })
        .where(eq(clubs.id, clubId));
      
      res.json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to join club" });
    }
  });

  // ============================================
  // AUCTION/BIDDING ROUTES
  // ============================================

  // Get active auctions
  app.get("/api/auctions", async (req, res) => {
    try {
      const activeAuctions = await db.select().from(auctions)
        .where(eq(auctions.status, 'active'))
        .orderBy(desc(auctions.endTime));
      
      res.json(activeAuctions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  // Get single auction with bids
  app.get("/api/auctions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [auction] = await db.select().from(auctions).where(eq(auctions.id, id));
      
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      // Get bid history
      const bids = await db.select().from(auctionBids)
        .where(eq(auctionBids.auctionId, id))
        .orderBy(desc(auctionBids.createdAt))
        .limit(20);
      
      res.json({ ...auction, bids });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch auction" });
    }
  });

  // Create auction
  app.post("/api/auctions", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const auctionData = insertAuctionSchema.parse({
        ...req.body,
        sellerId: req.userId
      });
      
      const [newAuction] = await db.insert(auctions).values(auctionData).returning();
      res.json(newAuction);
    } catch (error) {
      console.error('Error creating auction:', error);
      res.status(400).json({ message: "Invalid auction data" });
    }
  });

  // Place bid
  app.post("/api/auctions/:id/bid", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const auctionId = parseInt(req.params.id);
      const { amount } = req.body;
      
      const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId));
      
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      if (auction.status !== 'active') {
        return res.status(400).json({ message: "Auction is not active" });
      }
      
      if (new Date() > new Date(auction.endTime)) {
        return res.status(400).json({ message: "Auction has ended" });
      }
      
      const minBid = auction.currentBid 
        ? parseFloat(String(auction.currentBid)) + 1 
        : parseFloat(String(auction.startingPrice));
        
      if (parseFloat(amount) < minBid) {
        return res.status(400).json({ message: `Minimum bid is $${minBid}` });
      }

      // Create bid
      const [bid] = await db.insert(auctionBids).values({
        auctionId,
        bidderId: req.userId!,
        amount: amount.toString()
      }).returning();

      // Update auction
      await db.update(auctions).set({
        currentBid: amount.toString(),
        highestBidderId: req.userId,
        bidCount: sql`${auctions.bidCount} + 1`
      }).where(eq(auctions.id, auctionId));
      
      res.json(bid);
    } catch (error) {
      res.status(500).json({ message: "Failed to place bid" });
    }
  });

  // ============================================
  // STUDY GROUP ROUTES
  // ============================================

  // Get study groups
  app.get("/api/study-groups", async (req, res) => {
    try {
      const { university, course } = req.query;
      
      let groups = await db.select().from(studyGroups)
        .where(eq(studyGroups.isOpen, true))
        .orderBy(desc(studyGroups.createdAt));
      
      if (university) {
        groups = groups.filter(g => g.university === university);
      }
      if (course) {
        groups = groups.filter(g => 
          g.course.toLowerCase().includes((course as string).toLowerCase())
        );
      }
      
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study groups" });
    }
  });

  // Create study group
  app.post("/api/study-groups", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const groupData = insertStudyGroupSchema.parse({
        ...req.body,
        creatorId: req.userId
      });
      
      const [newGroup] = await db.insert(studyGroups).values(groupData).returning();
      
      // Auto-add creator as member
      await db.insert(studyGroupMemberships).values({
        groupId: newGroup.id,
        userId: req.userId!,
        role: 'creator'
      });
      
      res.json(newGroup);
    } catch (error) {
      console.error('Error creating study group:', error);
      res.status(400).json({ message: "Invalid study group data" });
    }
  });

  // Request to join study group
  app.post("/api/study-groups/:id/join", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      
      const [group] = await db.select().from(studyGroups).where(eq(studyGroups.id, groupId));
      
      if (!group) {
        return res.status(404).json({ message: "Study group not found" });
      }
      
      if (group.memberCount >= group.maxMembers) {
        return res.status(400).json({ message: "Group is full" });
      }

      // Check if already member
      const existing = await db.select().from(studyGroupMemberships)
        .where(and(eq(studyGroupMemberships.groupId, groupId), eq(studyGroupMemberships.userId, req.userId!)));

      if (existing.length > 0) {
        return res.status(400).json({ message: "Already a member or request pending" });
      }

      const [membership] = await db.insert(studyGroupMemberships).values({
        groupId,
        userId: req.userId!,
        role: 'member',
        status: group.isOpen ? 'active' : 'pending'
      }).returning();

      if (group.isOpen) {
        await db.update(studyGroups)
          .set({ memberCount: sql`${studyGroups.memberCount} + 1` })
          .where(eq(studyGroups.id, groupId));
      }
      
      res.json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to join study group" });
    }
  });

  // ============================================
  // SOCIAL/FOLLOW ROUTES
  // ============================================

  // Follow user
  app.post("/api/users/:id/follow", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const followingId = parseInt(req.params.id);
      
      if (followingId === req.userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const existing = await db.select().from(userFollows)
        .where(and(
          eq(userFollows.followerId, req.userId!),
          eq(userFollows.followingId, followingId)
        ));

      if (existing.length > 0) {
        return res.status(400).json({ message: "Already following" });
      }

      const [follow] = await db.insert(userFollows).values({
        followerId: req.userId!,
        followingId
      }).returning();
      
      res.json(follow);
    } catch (error) {
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Unfollow user
  app.delete("/api/users/:id/follow", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const followingId = parseInt(req.params.id);
      
      await db.delete(userFollows)
        .where(and(
          eq(userFollows.followerId, req.userId!),
          eq(userFollows.followingId, followingId)
        ));
      
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Get followers
  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const followers = await db.select().from(userFollows)
        .where(eq(userFollows.followingId, userId));
      res.json({ count: followers.length, followers });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  // Get following
  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const following = await db.select().from(userFollows)
        .where(eq(userFollows.followerId, userId));
      res.json({ count: following.length, following });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  // ============================================
  // SELLER REVIEWS
  // ============================================

  // Get seller reviews
  app.get("/api/sellers/:id/reviews", async (req, res) => {
    try {
      const sellerId = parseInt(req.params.id);
      const reviews = await db.select().from(sellerReviews)
        .where(eq(sellerReviews.sellerId, sellerId))
        .orderBy(desc(sellerReviews.createdAt));
      
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      
      res.json({ reviews, averageRating: avgRating, totalReviews: reviews.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Add review
  app.post("/api/sellers/:id/reviews", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const sellerId = parseInt(req.params.id);
      const reviewData = insertSellerReviewSchema.parse({
        ...req.body,
        reviewerId: req.userId,
        sellerId
      });
      
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      const [review] = await db.insert(sellerReviews).values(reviewData).returning();
      res.json(review);
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // ============================================
  // GAMIFICATION ROUTES
  // ============================================

  // Get user badges
  app.get("/api/users/:id/badges", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userBadgesList = await db.select({
        badge: badges,
        earnedAt: userBadges.earnedAt
      }).from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId));
      
      res.json(userBadgesList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Get all available badges
  app.get("/api/badges", async (req, res) => {
    try {
      const allBadges = await db.select().from(badges);
      res.json(allBadges);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Get user points/level
  app.get("/api/users/:id/points", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const [points] = await db.select().from(userPoints).where(eq(userPoints.userId, userId));
      
      if (!points) {
        return res.json({ points: 0, lifetimePoints: 0, level: 1, streak: 0 });
      }
      
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch points" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { type = 'points' } = req.query;
      
      const leaderboard = await db.select().from(userPoints)
        .orderBy(desc(userPoints.points))
        .limit(50);
      
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get points history
  app.get("/api/users/:id/points/history", apiLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (userId !== req.userId) {
        return res.status(403).json({ message: "Cannot view other user's points history" });
      }
      
      const history = await db.select().from(pointsHistory)
        .where(eq(pointsHistory.userId, userId))
        .orderBy(desc(pointsHistory.createdAt))
        .limit(50);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  console.log('Feature routes registered: Events, Clubs, Auctions, Study Groups, Social, Gamification');
}
