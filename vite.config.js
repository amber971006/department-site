import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VERCEL ? "/" : "/department-site/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true
  }
});
