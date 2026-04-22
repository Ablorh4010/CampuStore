import path from "path";
import fs from "fs";

// Plugin to copy 404.html to dist for GitHub Pages SPA fallback
function copy404Plugin() {
  return {
    name: 'copy-404',
    closeBundle() {
      const src = path.resolve(import.meta.dirname, '404.html');
      const dest = path.resolve(import.meta.dirname, 'dist/public/404.html');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('Copied 404.html to dist/public');
      }
    }
  };
}

const config = {
  plugins: [
    await import("@vitejs/plugin-react").then(m => m.default()),
    await import("@replit/vite-plugin-runtime-error-modal").then(m => m.default()),
    copy404Plugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname, "client"),
        path.resolve(import.meta.dirname, "attached_assets"),
        path.resolve(import.meta.dirname, "shared"),
        path.resolve(import.meta.dirname, "node_modules"),
      ],
      deny: ["**/.*"],
    },
  },
};

export default config;
