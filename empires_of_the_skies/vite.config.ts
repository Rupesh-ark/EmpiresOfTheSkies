import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/lab', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-game': ['boardgame.io'],
        },
      },
    },
  },
});