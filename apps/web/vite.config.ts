import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ws': {
        target: 'ws://localhost:4120',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:4120',
      },
    },
  },
});
