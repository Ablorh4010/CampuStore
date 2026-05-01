import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { setupSocketIO } from "./socket";

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));

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

app.get('/force-reload', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "storage", "executionContexts"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send('<h1>Force Reload Initiated</h1><p>Cache cleared. <a href="/">Click here to go home</a></p>');
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
        try {
          const stringified = JSON.stringify(capturedJsonResponse);
          if (stringified.length > 200) {
            logLine += ` :: ${stringified.slice(0, 200)}…`;
          } else {
            logLine += ` :: ${stringified}`;
          }
        } catch (e) {
          logLine += ` :: [Unserializable Response]`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  log("Starting server initialization...");
  const server = await registerRoutes(app);
  log("Routes registered and DB sync completed.");

  // Setup Socket.IO for real-time chat
  const io = setupSocketIO(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Global Error Handler:", err);
    res.status(status).json({ message });
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
    log(`serving on port ${port} - VERSION 1.6 - DEPLOY_ID: ${Date.now()}`);
    log(`Socket.IO enabled for real-time chat`);
  });
})();
