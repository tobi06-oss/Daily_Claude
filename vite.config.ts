import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://tobi06-oss.github.io/Daily_Claude/
export default defineConfig({
  base: './',
  plugins: [react()],
})
