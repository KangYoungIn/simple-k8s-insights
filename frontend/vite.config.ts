import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001', // Go Gin 서버로 프록시
    }
  },
  build: {
    outDir: 'dist',
  },
})
