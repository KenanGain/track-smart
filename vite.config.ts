import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { devApiPlugin } from './src/server/devApi'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env.local values visible to the dev-API plugin (process.env) so
  // /api/*.ts handlers can read RESEND_API_KEY etc. during `npm run dev`.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
  }

  return {
  plugins: [
    react(),
    devApiPlugin(),
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
  }
})
