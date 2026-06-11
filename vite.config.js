import { defineConfig } from 'vite'

// Statische build die supersnel via het Vercel-CDN laadt (ideaal voor mobiel).
// base: './' maakt alle paden relatief, zodat het overal werkt.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
    outDir: 'dist',
  },
})
