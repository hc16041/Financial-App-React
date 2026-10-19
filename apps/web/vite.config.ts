import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: { alias: { '@financial/core': path.resolve(import.meta.dirname, '../../packages/core/src/index.ts') } },
  test: { exclude: ['e2e/**', 'node_modules/**', 'dist/**'] },
})
