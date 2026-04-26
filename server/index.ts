import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { setupSocketIO } from "./socket";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// PREVIEW ACCESS CONFIGURATION
const PREVIEW_TOKEN = process.env.SECRET_PREVIEW_TOKEN || "uniexchange_preview_2026";

// Special URL to grant access
app.get("/preview-access", (req, res) => {
  const { token } = req.query;
  
  if (token === PREVIEW_TOKEN) {
    res.cookie('preview_access', PREVIEW_TOKEN, { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      path: '/'
    });
    return res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #22c55e;">Access Granted!</h1>
        <p>You can now view the website during development.</p>
        <a href="/" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Enter Website</a>
      </div>
    `);
  }
  
  res.status(403).send("Invalid preview token.");
});

// Maintenance / Coming Soon Middleware
app.use((req, res, next) => {
  // Allow assets, uploads, and preview-access route
  if (
    req.path.startsWith('/api') || 
    req.path.startsWith('/uploads') || 
    req.path.startsWith('/src') || 
    req.path.startsWith('/@') || 
    req.path === '/preview-access' ||
    req.path === '/favicon.ico' ||
    req.path === '/manifest.json' ||
    req.path === '/sw.js'
  ) {
    return next();
  }

  // Check for preview cookie
  if (req.cookies.preview_access === PREVIEW_TOKEN) {
    return next();
  }

  // Otherwise, serve the "Coming Soon" page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>UniExchange Hub | Coming Soon</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #000000;
          text-align: center;
        }
        .container {
          max-width: 600px;
          padding: 40px;
        }
        .logo {
          font-size: 32px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -1px;
          margin-bottom: 20px;
        }
        .logo span {
          color: #22c55e;
          font-style: italic;
        }
        h1 {
          font-size: 48px;
          font-weight: 900;
          margin: 0 0 20px 0;
          letter-spacing: -2px;
          text-transform: uppercase;
        }
        p {
          font-size: 18px;
          color: #666;
          font-weight: 500;
          margin-bottom: 40px;
        }
        .badge {
          display: inline-block;
          padding: 6px 12px;
          background: #f0fdf4;
          color: #166534;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 60px;
          font-size: 12px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">UniExchange<span>Hub.</span></div>
        <div class="badge">Development Phase</div>
        <h1>Page will be live soon.</h1>
        <p>We are currently setting up the best campus marketplace experience for you. Stay tuned!</p>
        <div class="footer">The University Hub &copy; 2026</div>
      </div>
    </body>
    </html>
  `);
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Cache control for PWA assets
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/gh')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (req.path === '/sw.js' || req.path === '/manifest.json') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
  next();
});

// Manual clear route
app.get('/clear-cache', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "storage", "executionContexts"');
  res.send('<h1>Cache Cleared</h1><p>Please <a href="/gh/browse">click here</a> to go to the store.</p>');
});


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup Socket.IO for real-time chat
  const io = setupSocketIO(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Socket.IO enabled for real-time chat`);
  });
})();
