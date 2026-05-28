import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Nominatim calls during local development to avoid CORS issues.
      // Client can call `/nominatim/search?format=json&q=...` and Vite will forward to
      // https://nominatim.openstreetmap.org/search?format=json&q=...
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        configure: (proxy) => {
          // Add a benign User-Agent header on proxied requests (Nominatim requires it).
          proxy.on('proxyReq', (proxyReq) => {
            try {
              proxyReq.setHeader('User-Agent', 'BloodBankDev/1.0 (dev)');
            } catch (e) {
              // best-effort
            }
          });
        },
      },
    },
  },
});