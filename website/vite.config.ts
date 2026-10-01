import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Website admin (perlu login) — jalan di http://localhost:5173 secara default
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
  target: 'es2020',
  rollupOptions: {
    output: { manualChunks: { react: ['react', 'react-dom'], icons: ['lucide-react'] } },
  },
},
  server: {
    port: 5173,
  },
})
