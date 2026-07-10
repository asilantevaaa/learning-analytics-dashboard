import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' делает сборку переносимой — её можно положить в любую папку на сервере.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // В режиме разработки запросы /api проксируются на бэкенд (server/).
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
