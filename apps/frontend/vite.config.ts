import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "icon-192.png", "icon-512.png", "push-handler.js"],
      workbox: {
        importScripts: ["push-handler.js"],
      },
      manifest: {
        name: "ATHLON",
        short_name: "ATHLON",
        description: "Gestão esportiva para treinadores e atletas",
        start_url: "/",
        scope: "/",
        theme_color: "#5C3D2E",
        background_color: "#FDF8F3",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
