/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv, bo goły process.env w configu nie widzi plików .env
  const env = loadEnv(mode, process.cwd(), '');
  // Domyślnie BETA — prod tylko jawnie przez VITE_API_PROXY_TARGET w .env
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'https://backend.beta.mamamia.app';

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/api/sunshine': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
