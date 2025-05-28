import { fileURLToPath, URL } from 'node:url'
import wasmPack from 'vite-plugin-wasm-pack'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import fs from 'node:fs'

const wasmMimePlugin = {
  name: 'wasm-mime',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configureServer(server: any) {
    // @ts-expect-error - Vite types are not fully compatible with Node.js types
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.endsWith('.wasm')) {
        const wasmPath = path.join(__dirname, 'node_modules/image_wasm', path.basename(req.url));
        const wasmFile = fs.readFileSync(wasmPath);
        res.setHeader('Content-Type', 'application/wasm');
        res.end(wasmFile);
        return;
      }
      next();
    });
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')
  return {
    worker: {
      format: 'es'
    },
    base: env.VITE_APP_BASE_PATH || '/',
    plugins: [wasmMimePlugin, vue(), wasmPack(['./image_wasm'])],
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
