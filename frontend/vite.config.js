// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,  // Force port 5173
    proxy: {
      '/api': {
        target: 'http://13.232.176.65:3000',
        changeOrigin: true,
      }
    }
  }
})