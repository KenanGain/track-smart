import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'stream', 'process', 'events', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    // Avoid transient EBUSY reload errors on Windows while editors are still writing files.
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
