import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    __PROJECT_PATH__: JSON.stringify(path.resolve(process.cwd(), "..")),
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
