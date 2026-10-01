import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import travelNewsHandler from './api/travel-news.js'
import { createGenerateItineraryHandler } from './api/generate-itinerary.js'
import { createRefineItineraryHandler } from './api/refine-itinerary.js'
import accommodationsHandler from './api/accommodations.js'
import dayRouteHandler from './api/day-route.js'

function localApis(env) {
  const generateItineraryHandler = createGenerateItineraryHandler({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_GENERATE_MODEL || env.GEMINI_MODEL,
    geminiFallbackModel: env.GEMINI_GENERATE_FALLBACK_MODEL || env.GEMINI_FALLBACK_MODEL,
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  })
  const refineItineraryHandler = createRefineItineraryHandler({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_REFINE_MODEL || env.GEMINI_MODEL,
    geminiFallbackModel: env.GEMINI_REFINE_FALLBACK_MODEL,
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  })
  return {
    name: 'tripgenie-local-apis',
    configureServer(server) {
      server.middlewares.use('/api/travel-news', travelNewsHandler)
      server.middlewares.use('/api/generate-itinerary', generateItineraryHandler)
      server.middlewares.use('/api/refine-itinerary', refineItineraryHandler)
      server.middlewares.use('/api/accommodations', accommodationsHandler)
      server.middlewares.use('/api/day-route', dayRouteHandler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return { plugins: [react(), localApis(env)] }
})
