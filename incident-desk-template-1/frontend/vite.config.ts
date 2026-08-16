import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPortFile = resolve(__dirname, "../.dev/backend.port");

// The backend publishes the port it actually bound to. Prefer that over PORT
// so a dev server started against an already-running backend still proxies to
// the right place. With PORT set the backend binds it or exits, so the two
// agree by construction.
//
// NOTE: this is resolved once, at config load. Vite's proxy has no per-request
// `target` hook — `router` belongs to http-proxy-middleware and is silently
// ignored by the http-proxy that Vite bundles — so a proxy that "follows" a
// moving backend is not something this config can express. The port contract
// is enforced in main.go and the dibbla task instead.
function backendPort(): string {
  if (existsSync(backendPortFile)) {
    const raw = readFileSync(backendPortFile, "utf8").trim();
    const p = parseInt(raw, 10);
    if (Number.isFinite(p) && p > 0 && p <= 65535) return String(p);
  }
  return process.env.PORT || "8180";
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.VITE_PORT || "5290"),
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort()}`,
        changeOrigin: true,
      },
    },
  },
});
