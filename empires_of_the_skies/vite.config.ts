import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // This handles the buffer/crypto/stream imports your old project relied on
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Optional: If you used absolute imports like 'components/...' 
      // you might need to map them here, otherwise relative paths work fine.
    },
  },
})