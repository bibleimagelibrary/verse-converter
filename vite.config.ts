import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/verse-converter/" : "/",
  server: {
    port: 5173,
    open: true,
  },
});
