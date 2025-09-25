import { createHtmlPlugin } from 'vite-plugin-html'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: path.join(__dirname, 'public'),

  build: {
    outDir: path.join(__dirname, 'static'),
    emptyOutDir: true
  },
  
  server: {
    host: '0.0.0.0',
    port: 8080,

    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  plugins: [
    preact(),
    
    createHtmlPlugin({
      minify: true
    })
  ]
})
