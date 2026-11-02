import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Three.js + R3F menghasilkan chunk besar; naikkan ambang peringatan.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Pisahkan vendor besar agar cache lebih stabil saat kode app berubah.
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('@react-three')) return 'vendor-r3f';
        },
      },
    },
  },
});
