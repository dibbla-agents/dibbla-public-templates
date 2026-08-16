import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    port: parseInt(process.env.VITE_PORT || '5335'),
    // Fail loudly instead of silently moving to the next free port — the
    // dibbla task opens the browser at VITE_PORT, so a silent switch would
    // land the user on a dead URL.
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
