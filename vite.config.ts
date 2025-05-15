import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_APP_BASE_PATH || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      allowedHosts: ['raspberrypi.local', 'localhost', '127.0.0.1'],
      cors: {
        origin: ['http://raspberrypi.local', 'http://localhost:32323', 'http://127.0.0.1:32323']
      },
      proxy: {
        '^/discovery/': {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        '^/proxy/': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})
