import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom'],
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'framer-motion',
          'lucide-react',
        ],
      },
      build: {
        rollupOptions: {
          output: {
            entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
          }
        }
      }
    };
});
