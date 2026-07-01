import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // exceljs/pdf/charts are large but deferred: only load on user-triggered export actions
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // Core React — always loaded
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';
          // Charting — lazy (only loads when chart pages are visited)
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
          // Icons
          if (id.includes('lucide-react')) return 'vendor-icons';
          // Animation — landing page
          if (id.includes('framer-motion')) return 'vendor-motion';
          // PDF/image export — dynamically imported inside export handlers
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          // Excel export — dynamically imported inside export handlers
          if (id.includes('exceljs')) return 'vendor-excel';
          // Auth & DB
          if (id.includes('@supabase')) return 'vendor-supabase';
          // UI primitives
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // Date utilities
          if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-date';
          // Remaining small utilities: clsx, cva, tailwind-merge, etc.
          return 'vendor-misc';
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  }
})
