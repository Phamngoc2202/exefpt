import { createClient } from '@supabase/supabase-js'
import { findDestination } from '../src/data/northernDestinations.js'
import { activityTypeForCategory, validateTripForm } from '../src/lib/tripPlanner.js'
import { fetchWeatherForecast } from '../src/lib/weather.js'

const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const DEFAULT_FALLBACK_MODEL = 'gemini-3.8-flash'
const MAX_BODY_SIZE = 48_000

const refinementSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    explanation: { type: 'string' },
    activities: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          time: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['title', 'time', 'note'],
      },
    },
    fixedActivityTimes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, time: { type: 'string' } },
        required: ['id', 'time'],
      },
    },
  },
  required: ['label', 'explanation', 'activities', 'fixedActivityTimes'],
}

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body)
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > MAX_BODY_SIZE) throw new Error('request_too_large')
  }
  return body ? JSON.parse(body) : {}
}

function bearerToken(request) {
  const header = request.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function serverEnv(overrides = {}) {
  const runtime = globalThis.process?.env || {}
  return {
    geminiApiKey: overrides.geminiApiKey || runtime.GEMINI_API_KEY,
    geminiModel: overrides.geminiModel || runtime.GEMINI_REFINE_MODEL || runtime.GEMINI_MODEL || DEFAULT_MODEL,
    geminiFallbackModel: overrides.geminiFallbackModel || runtime.GEMINI_REFINE_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL,
    supabaseUrl: overrides.supabaseUrl || runtime.VITE_SUPABASE_URL || runtime.SUPABASE_URL,
    supabaseKey: overrides.supabaseKey || runtime.VITE_SUPABASE_PUBLISHABLE_KEY || runtime.SUPABASE_PUBLISHABLE_KEY || runtime.SUPABASE_ANON_KEY,
  }
}

function createUserClient(env, authorization) {
  return createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
}

const cleanText = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : ''
const validTime = (value, fallback) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? value : fallback

export function refineDayFromGemini(form, currentDay, refinement, excludedTitles = [], additionalActivities = []) {
  const destination = findDestination(form.destination)
  const allowedActivities = [...additionalActivities, ...(destination?.activities || [])]
  const allowed = new Map(allowedActivities.map((activity) => [activity.title, activity]))
  const excluded = new Set(excludedTitles)
  const selectedTitles = new Set()
  const selectedActivities = []

  for (const proposed of Array.isArray(refinement?.activities) ? refinement.activities : []) {
    const source = allowed.get(proposed.title)
    if (!source || excluded.has(source.title) || selectedTitles.has(source.title)) continue
    if (source.exclusiveWith && selectedTitles.has(source.exclusiveWith)) continue
    const index = selectedActivities.length
    selectedTitles.add(source.title)
    selectedActivities.push({
      id: `${currentDay.date}-ai-${index + 1}`,
      time: validTime(proposed.time, index === 0 ? '09:00' : '14:00'),
      title: source.title,
      category: 'Hoạt động',
      cost: Math.max(0, Math.round(source.costPerPerson * Number(form.travelers))),
      note: cleanText(proposed.note, 180) || source.note || 'Hoạt động được TripGenie AI đề xuất.',
      type: activityTypeForCategory('Hoạt động', source.type),
      searchName: source.aliases?.[0] || source.searchName || source.title,
      location: source.location || form.destination,
      coordinates: source.coordinates,
      source: source.source,
      sourceUrl: source.sourceUrl,
      external: source.external,
    })
    if (selectedActivities.length === 2) break
  }

  if (!selectedActivities.length) throw new Error('no_valid_activities')
  const fixedActivityIds = new Set((Array.isArray(currentDay.activities) ? currentDay.activities : [])
    .filter((activity) => activity.category !== 'Hoạt động').map((activity) => activity.id))
  const fixedTimeUpdates = new Map((Array.isArray(refinement?.fixedActivityTimes) ? refinement.fixedActivityTimes : [])
    .filter((update) => fixedActivityIds.has(update.id) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(update.time || ''))
    .map((update) => [update.id, update.time]))
  const fixedActivities = (Array.isArray(currentDay.activities) ? currentDay.activities : [])
    .filter((activity) => activity.category !== 'Hoạt động')
    .map((activity) => ({ ...activity, time: fixedTimeUpdates.get(activity.id) || activity.time }))
  const activities = [...fixedActivities, ...selectedActivities].sort((a, b) => a.time.localeCompare(b.time))

  return {
    day: { ...currentDay, label: cleanText(refinement.label, 90) || currentDay.label, activities },
    explanation: cleanText(refinement.explanation, 240),
  }
}

export async function requestGeminiRefinement(input, env) {
  const models = [...new Set([env.geminiModel || DEFAULT_MODEL, env.geminiFallbackModel || DEFAULT_FALLBACK_MODEL])]
  let lastError

  for (const model of models) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'Bạn là trợ lý chỉnh sửa lịch trình du lịch miền Bắc Việt Nam. Chỉ dùng nguyên văn tên trong allowedActivities, chọn 1 hoặc 2 hoạt động, không dùng excludedTitles. Nếu weatherForecast có dữ liệu và khả năng mưa từ 60%, hãy hạn chế hoạt động thiên nhiên ngoài trời; nếu weatherForecast là null thì không được tự đoán thời tiết. Bạn được điều chỉnh giờ của các mục trong fixedActivities bằng fixedActivityTimes nhưng phải giữ nguyên id, tên, loại và chi phí. Nếu người dùng yêu cầu đổi giờ khởi hành, bữa ăn, lưu trú hoặc trở về, hãy cập nhật đúng mục đó và sắp xếp các hoạt động còn lại phù hợp: ăn trưa nên trong 11:00-14:00, ăn tối trong 17:00-20:30, lưu trú sau hoạt động cuối, không xếp hoạt động sau giờ trở về. Giờ phải có dạng HH:mm và không trùng nhau. Tôn trọng yêu cầu riêng, ngân sách và chỉ dẫn chỉnh sửa. Không tự tạo địa điểm hoặc giá. Trả lời hoàn toàn bằng tiếng Việt.' }],
          },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1536,
            responseMimeType: 'application/json',
            responseJsonSchema: refinementSchema,
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || `Gemini responded with ${response.status}`)
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
      if (!text) throw new Error('Gemini did not return a refinement')
      return JSON.parse(text)
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError || new Error('Gemini did not return a refinement')
}

export function createRefineItineraryHandler(overrides = {}) {
  return async function refineItineraryHandler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }

    const env = serverEnv(overrides)
    if (!env.geminiApiKey || !env.supabaseUrl || !env.supabaseKey) {
      sendJson(response, 500, { error: 'Máy chủ chưa được cấu hình Gemini hoặc Supabase.' })
      return
    }
    const token = bearerToken(request)
    if (!token) {
      sendJson(response, 401, { error: 'Bạn cần đăng nhập để dùng TripGenie AI.' })
      return
    }

    try {
      const body = await readJsonBody(request)
      const form = body.form || {}
      const dayNumber = Number(body.dayNumber)
      const currentDay = body.currentDay
      const instruction = cleanText(body.instruction, 300) || 'Sắp xếp lại ngày này cân bằng và phù hợp với sở thích của tôi.'
      const validationError = validateTripForm(form)
      if (validationError || !body.tripId || !Number.isInteger(dayNumber) || currentDay?.day !== dayNumber) {
        sendJson(response, 400, { error: validationError || 'Dữ liệu ngày cần chỉnh sửa không hợp lệ.' })
        return
      }

      const authorization = `Bearer ${token}`
      const supabase = createUserClient(env, authorization)
      const { data: authData, error: authError } = await supabase.auth.getUser(token)
      if (authError || !authData.user) {
        sendJson(response, 401, { error: 'Phiên đăng nhập không còn hợp lệ.' })
        return
      }
      const { data: trip, error: tripError } = await supabase.from('trips').select('id,destination,itinerary').eq('id', body.tripId).maybeSingle()
      if (tripError || !trip || trip.destination !== form.destination) {
        sendJson(response, 403, { error: 'Bạn không có quyền chỉnh sửa chuyến đi này.' })
        return
      }

      const destination = findDestination(form.destination)
      const storedDay = (Array.isArray(trip.itinerary?.days) ? trip.itinerary.days : []).find((day) => day.date === currentDay.date)
      const additionalActivities = (Array.isArray(storedDay?.activities) ? storedDay.activities : [])
        .filter((activity) => activity.external && activity.source === 'OpenStreetMap' && Number.isFinite(activity.coordinates?.lat) && Number.isFinite(activity.coordinates?.lng))
        .map((activity) => ({
          title: activity.title,
          aliases: [activity.title.replace(/^Tham quan\s+/i, '')],
          costPerPerson: Math.round((Number(activity.cost) || 0) / Math.max(1, Number(form.travelers) || 1)),
          tags: ['Văn hóa', 'Chụp ảnh'],
          suggestedDay: dayNumber,
          note: activity.note,
          type: activity.type,
          location: activity.location,
          coordinates: activity.coordinates,
          source: activity.source,
          sourceUrl: activity.sourceUrl,
          external: true,
        }))
      const allAllowedActivities = [...additionalActivities, ...destination.activities]
      const forecast = await fetchWeatherForecast(destination.coordinates).catch(() => ({}))
      const excludedTitles = (Array.isArray(body.otherActivityTitles) ? body.otherActivityTitles : [])
        .filter((title) => allAllowedActivities.some((activity) => activity.title === title))
      const refinement = await requestGeminiRefinement({
        trip: {
          destination: form.destination,
          travelers: Number(form.travelers),
          budgetVnd: Number(form.budget),
          style: form.style,
          interests: form.interests,
          specialRequest: cleanText(form.specialRequest, 500),
        },
        day: dayNumber,
        date: currentDay.date,
        weatherForecast: forecast[currentDay.date] || null,
        instruction,
        currentActivities: currentDay.activities.map(({ id, time, title, category }) => ({ id, time, title, category })),
        fixedActivities: currentDay.activities.filter((activity) => activity.category !== 'Hoạt động').map(({ id, time, title, category }) => ({ id, time, title, category })),
        allowedActivities: allAllowedActivities.map(({ title, tags, suggestedDay, note }) => ({ title, tags, suggestedDay, note })),
        excludedTitles,
      }, env)
      const result = refineDayFromGemini(form, currentDay, refinement, excludedTitles, additionalActivities)
      sendJson(response, 200, result)
    } catch (error) {
      const status = error.message === 'request_too_large' ? 413 : error instanceof SyntaxError ? 400 : error.message === 'no_valid_activities' ? 422 : 502
      const message = status === 422 ? 'AI chưa tìm được hoạt động thay thế phù hợp.' : status === 502 ? 'TripGenie AI chưa thể chỉnh lịch trình lúc này.' : 'Dữ liệu yêu cầu không hợp lệ.'
      sendJson(response, status, { error: message })
    }
  }
}

export default createRefineItineraryHandler()
