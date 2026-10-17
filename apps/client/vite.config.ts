import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    https: {
      key: readFileSync("C:\\Users\\adeni\\Documents\\Cert\\key.pem"),
      cert: readFileSync("C:\\Users\\adeni\\Documents\\Cert\\cert.pem"),
    },
    host: "0.0.0.0",
    port: 5173,
  },
});
