import { defineConfig  } from 'vite'

export default defineConfig({
  root: './',
  publicDir: 'public',
  build: {
    emptyOutDir: true,
    outDir: 'dist',
  }
})
