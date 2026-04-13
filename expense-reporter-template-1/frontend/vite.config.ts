import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const port = process.env.PORT || "8081";

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
        target: `http://127.0.0.1:${port}`,
        changeOrigin: true,
      },
      "/_platform": {
        target: "http://localhost:3456",
        changeOrigin: true,
      },
    },
  },
});
