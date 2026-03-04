import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      exceljs: 'exceljs/dist/exceljs.bare.min.js',
    },
  },
})
