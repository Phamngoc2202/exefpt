import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import travelNewsHandler from './api/travel-news.js'

function travelNewsApi() {
  return {
    name: 'tripgenie-travel-news-api',
    configureServer(server) {
      server.middlewares.use('/api/travel-news', travelNewsHandler)
    },
  }
}

export default defineConfig({
  plugins: [react(), travelNewsApi()],
})
