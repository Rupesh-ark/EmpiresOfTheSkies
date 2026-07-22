import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(({ command }) => ({
  // top-level Vite option; nested under `build` it is silently ignored
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] as const } : undefined,
  plugins: [
    react(),
    visualizer({
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/lab',
      '@emotion/react',
      '@emotion/styled',
      'react',
      'react-dom',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@mui/x-charts'))       return 'vendor-charts';
          if (id.includes('@mui/material'))        return 'vendor-mui-core';
          if (id.includes('@emotion'))             return 'vendor-mui-core';
          if (id.includes('@mui/icons-material'))  return 'vendor-mui-icons';
          if (id.includes('@mui/lab'))             return 'vendor-mui-lab';
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react/'))  return 'vendor-react';
          if (id.includes('boardgame.io'))         return 'vendor-game';
        },
      },
    },
  },
}));
