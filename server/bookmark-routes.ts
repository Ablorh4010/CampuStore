import type { Express } from "express";
import { storage } from "./storage";
import { authenticateToken, type AuthRequest } from "./auth";
import { extractProductFromHtml } from "./ai";
import rateLimit from "express-rate-limit";

const bookmarkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many imports, please try again later.',
});

export function registerBookmarkRoutes(app: Express) {
  // Get all bookmarks for user
  app.get("/api/bookmarks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bookmarks = await storage.getBookmarksByUserId(req.userId!);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  // Create a bookmark (Magic Import - Capture phase)
  app.post("/api/bookmarks", bookmarkLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`Bookmark Import: Fetching content from ${url}`);
      
      let html = '';
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          }
        });

        if (response.ok) {
          html = await response.text();
        } else {
          // Try a second time with minimal headers
          const response2 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (response2.ok) {
            html = await response2.text();
          }
        }
      } catch (e) {
        console.error("Fetch error during bookmarking:", e);
      }

      let extractedData: any = {};
      if (html) {
        try {
          extractedData = await extractProductFromHtml(html);
        } catch (e) {
          console.error("AI extraction failed for bookmark:", e);
        }
      }

      const bookmark = await storage.createBookmark({
        userId: req.userId!,
        url,
        title: extractedData.title || "Pending Import",
        description: extractedData.description || "",
        image: extractedData.images?.[0] || "",
        price: extractedData.price?.toString() || "",
        category: extractedData.categoryName || "",
        status: html ? "pending" : "failed"
      });

      res.json(bookmark);
    } catch (error) {
      console.error("Bookmark Error:", error);
      res.status(500).json({ message: "Failed to capture site as bookmark" });
    }
  });

  // Delete bookmark
  app.delete("/api/bookmarks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBookmark(id);
      res.json({ message: "Bookmark removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bookmark" });
    }
  });
}
