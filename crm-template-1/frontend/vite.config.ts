import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.VITE_PORT || "5175"),
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.PORT || "8080"}`,
        changeOrigin: true,
      },
    },
  },
});
