import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Note: lucide-react is intentionally pre-bundled (not excluded). Excluding it
  // makes Vite serve each icon as a separate module, including an icon named
  // "fingerprint.js" that privacy/ad blockers block (ERR_BLOCKED_BY_CLIENT),
  // which breaks the whole app in browsers with such extensions.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});