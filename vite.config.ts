import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/verse-converter/" : "/",
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
});
