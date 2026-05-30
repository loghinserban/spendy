import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Allow proxying requests during local dev to a backend with a self-signed cert.
// Set VITE_API_URL in your environment to override the default backend address.
// Default to local backend for developer convenience; production should set
// VITE_API_URL (Vercel) to your Render backend URL.
const backendTarget = process.env.VITE_API_URL || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    https: {},
    proxy: {
      // Proxy key paths used by the frontend to the backend dev server.
      // `secure: false` allows a self-signed cert on the backend to be proxied.
      // `ws: true` enables WebSocket proxying for chat/ws endpoints.
      '/login': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/register': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/expenses': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: false,
      },
      '/chat': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/forgot-password': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/reset-password': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/2fa': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Catch-all for any other /api/* paths not explicitly listed above
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Use forks to avoid worker-thread heap crashes in larger jsdom suites on Windows.
    pool: 'forks',
    setupFiles: ['src/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'coverage/**', 'spendy-server/**', '**/dist/**'],
    fileParallelism: false,
    maxWorkers: 1,
  },
})
