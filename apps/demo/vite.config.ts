import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://serhiitroinin.github.io/kitcut/
export default defineConfig({
  base: "/kitcut/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
