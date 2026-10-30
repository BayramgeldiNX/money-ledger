import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Served from https://bayramgeldinx.github.io/money-ledger/ — BASE can override for other hosts.
const base = process.env.BASE || "/money-ledger/";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : base,
  // Shown in Settings so you can see which version a device runs.
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC") },
  build: { target: "es2020", chunkSizeWarningLimit: 1200 },
  // Worktrees share node_modules from the main checkout, outside the project folder; without this the dev server blocks the fonts.
  server: { fs: { strict: false } },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        id: base,
        name: "Money Ledger",
        short_name: "Money Ledger",
        description: "Where your money went and why, in yuan and dollars.",
        lang: "en",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "any",
        background_color: "#F2F2F5",
        theme_color: "#F2F2F5",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { environment: "node", include: ["tests/**/*.test.js"], globalSetup: ["tests/global-setup.js"] },
}));
