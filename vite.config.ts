import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://<계정>.github.io/on-gi-claude/
export default defineConfig({
  base: './',
  plugins: [react()],
})
