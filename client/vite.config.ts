import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // VITE_API_URL is used in production to point to the deployed backend.
    // In local dev, leave it unset and the proxy below handles /api/* calls.
    define: {
      __API_BASE__: JSON.stringify(env.VITE_API_URL || ''),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});