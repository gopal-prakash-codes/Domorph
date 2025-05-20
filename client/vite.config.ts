import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      '127.0.0.1',
      'localhost',
      '0c00-2405-201-4021-1a43-1d03-7e85-158-2806.ngrok-free.app', // Add your ngrok URL here
    ],
  },
})
