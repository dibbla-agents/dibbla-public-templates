import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPortFile = resolve(__dirname, "../.dev/backend.port");
const fallbackPort = process.env.PORT || "8210";

// Read the actual port the Go backend bound to. If the backend fell back to
// a non-preferred port (e.g. 8210 was taken → picked 8211), it writes the
// real port to .dev/backend.port and the proxy follows it automatically.
function readBackendPort(): number {
  if (existsSync(backendPortFile)) {
    const raw = readFileSync(backendPortFile, "utf8").trim();
    const p = parseInt(raw, 10);
    if (Number.isFinite(p) && p > 0 && p <= 65535) return p;
  }
  return parseInt(fallbackPort, 10);
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.VITE_PORT || "5305"),
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${fallbackPort}`,
        changeOrigin: true,
        router: () => `http://127.0.0.1:${readBackendPort()}`,
      },
      "/_platform": {
        target: "http://localhost:3456",
        changeOrigin: true,
      },
    },
  },
});
