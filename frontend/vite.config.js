import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base нужен только для GitHub Pages (production).
// В dev-режиме — '/' чтобы работал http://localhost:5173/...
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/cinevault-mvp/" : "/",
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
}));
