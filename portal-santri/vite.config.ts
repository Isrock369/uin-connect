import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Portal Santri (kiosk timbang, publik) — jalan di http://localhost:5174 secara default
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
  target: 'es2020',
  rollupOptions: {
    output: { manualChunks: { react: ['react', 'react-dom'], icons: ['lucide-react'] } },
  },
},
  server: {
    port: 5174,
  },
})
