import { createClient } from '@supabase/supabase-js'
import { planFromRow, toTripPayload } from '../src/lib/tripPlanner.js'
import { hasMissingRestaurants, suggestRestaurants } from '../src/lib/restaurantSuggestions.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

export function createSuggestRestaurantsHandler(overrides = {}) {
  return async function suggestRestaurantsHandler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }
    const runtime = globalThis.process?.env || {}
    const supabaseUrl = overrides.supabaseUrl || runtime.VITE_SUPABASE_URL || runtime.SUPABASE_URL
    const supabaseKey = overrides.supabaseKey || runtime.VITE_SUPABASE_PUBLISHABLE_KEY || runtime.SUPABASE_PUBLISHABLE_KEY || runtime.SUPABASE_ANON_KEY
    const geminiApiKey = overrides.geminiApiKey || runtime.GEMINI_API_KEY
    if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
      sendJson(response, 503, { error: 'Máy chủ chưa được cấu hình để gợi ý quán.' })
      return
    }
    const authorization = request.headers.authorization || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) {
      sendJson(response, 401, { error: 'Bạn cần đăng nhập để gợi ý quán.' })
      return
    }
    let body
    try {
      if (request.body && typeof request.body === 'object') body = request.body
      else if (typeof request.body === 'string') body = JSON.parse(request.body)
      else {
        let raw = ''
        for await (const chunk of request) {
          raw += chunk
          if (raw.length > 1000) throw new Error('too_large')
        }
        body = JSON.parse(raw)
      }
    } catch {
      sendJson(response, 400, { error: 'Dữ liệu yêu cầu không hợp lệ.' })
      return
    }
    if (!UUID.test(body?.tripId || '')) {
      sendJson(response, 400, { error: 'Mã chuyến đi không hợp lệ.' })
      return
    }
    try {
      const supabase = (overrides.createClientImpl || createClient)(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authorization } },
      })
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        sendJson(response, 401, { error: 'Phiên đăng nhập đã hết hạn.' })
        return
      }
      const { data: row, error: readError } = await supabase.from('trips').select('*').eq('id', body.tripId).eq('user_id', user.id).maybeSingle()
      if (readError) throw readError
      if (!row) {
        sendJson(response, 404, { error: 'Không tìm thấy chuyến đi của bạn.' })
        return
      }
      const plan = planFromRow(row)
      if (!hasMissingRestaurants(plan)) {
        sendJson(response, 200, { trip: row, updated: false })
        return
      }
      const enriched = await (overrides.suggestRestaurantsImpl || suggestRestaurants)(plan, {
        geminiApiKey,
        geminiModel: overrides.geminiModel || runtime.GEMINI_GENERATE_MODEL || runtime.GEMINI_MODEL || 'gemini-3.8-flash',
        geminiFallbackModel: overrides.geminiFallbackModel || runtime.GEMINI_GENERATE_FALLBACK_MODEL || runtime.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
        useMapsGrounding: overrides.useMapsGrounding ?? runtime.GEMINI_MAPS_GROUNDING === 'true',
      })
      if (hasMissingRestaurants(enriched) && enriched === plan) {
        sendJson(response, 503, { error: 'Gemini chưa trả về quán phù hợp. Hãy thử lại sau.' })
        return
      }
      const itinerary = toTripPayload(enriched, user.id).itinerary
      const { data: updated, error: updateError } = await supabase.from('trips')
        .update({ itinerary }).eq('id', body.tripId).eq('updated_at', row.updated_at).select('*').maybeSingle()
      if (updateError) throw updateError
      if (!updated) {
        sendJson(response, 409, { error: 'Chuyến đi vừa được chỉnh sửa. Hãy tải lại rồi thử tiếp.' })
        return
      }
      sendJson(response, 200, { trip: updated, updated: true, hasMissingRestaurants: hasMissingRestaurants(enriched) })
    } catch {
      sendJson(response, 500, { error: 'Chưa thể gợi ý quán lúc này.' })
    }
  }
}

export default createSuggestRestaurantsHandler()
