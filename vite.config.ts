import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = Number(process.env.API_PORT ?? 8787)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@server': fileURLToPath(new URL('./server', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The API runs as its own process in development; the browser only ever talks to Vite.
    proxy: { '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: false } },
    // The e2e build output would otherwise reload open dev tabs on every test run.
    watch: { ignored: ['**/dist-e2e/**'] },
  },
})
