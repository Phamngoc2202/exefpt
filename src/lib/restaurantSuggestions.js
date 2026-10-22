import { normalizePlaceText } from './placeSearch.js'

const MEAL_ID = /-(lunch|dinner)$/

function isGoogleMapsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'maps.google.com'
      || (url.hostname === 'www.google.com' && url.pathname.startsWith('/maps'))
    )
  } catch {
    return false
  }
}

function mealSlots(plan) {
  return plan.days.flatMap((day) => day.activities
    .filter((activity) => MEAL_ID.test(activity.id) && !activity.sourceUrl && /^Ăn (trưa|tối) địa phương$/i.test(activity.title))
    .map((activity) => ({
      day: day.day,
      meal: activity.id.endsWith('-lunch') ? 'TRUA' : 'TOI',
      id: activity.id,
      anchor: day.activities.find((item) => item.id.endsWith(activity.id.endsWith('-lunch') ? '-morning' : '-afternoon'))?.location
        || day.destination || plan.form.destination,
    })))
}

export function hasMissingRestaurants(plan) {
  return mealSlots(plan).length > 0
}

export function buildRestaurantPrompt(plan) {
  const slots = mealSlots(plan)
  if (!slots.length) return ''
  const lines = slots.map(({ day, meal, anchor }) => `NGAY ${day} ${meal}: gần ${anchor}, ${plan.form.destination}`)
  return `Gợi ý đúng một quán ăn đang hoạt động tại Việt Nam cho mỗi bữa sau. Ưu tiên quán gần khu vực ghi sau dấu hai chấm và có phản hồi tích cực trên Google Maps. Chỉ chọn quán có địa điểm thật trong Google Maps, không tự tạo tên quán. Trả về đúng một dòng cho mỗi bữa theo mẫu "NGAY 1 TRUA: Tên quán" hoặc "NGAY 1 TOI: Tên quán"; nếu không tìm được thì bỏ dòng đó. Không ghi điểm sao, số lượt đánh giá hay giá món ăn.\n${lines.join('\n')}`
}

export function buildUnverifiedRestaurantPrompt(plan) {
  const slots = mealSlots(plan)
  if (!slots.length) return ''
  const lines = slots.map(({ day, meal, anchor }) => `NGAY ${day} ${meal}: gần ${anchor}, ${plan.form.destination}`)
  return `Hãy gợi ý đúng một quán ăn có tên cụ thể cho mỗi bữa ở Việt Nam. Ưu tiên gần khu vực sau dấu hai chấm. Bạn không có dữ liệu bản đồ trực tiếp, nên chỉ gợi ý tên quán nếu khá chắc; không tự nhận đã xác minh địa chỉ, đánh giá hay giờ mở cửa. Trả về đúng một dòng theo mẫu "NGAY 1 TRUA: Tên quán" hoặc "NGAY 1 TOI: Tên quán"; bỏ dòng nếu không biết. Không ghi điểm sao, giá hay giải thích.\n${lines.join('\n')}`
}

export function applyUnverifiedRestaurants(plan, candidate) {
  const text = candidate?.content?.parts?.map((part) => part.text || '').join('\n') || ''
  if (!text) return plan
  const slots = new Map(mealSlots(plan).map((slot) => [`${slot.day}:${slot.meal}`, slot]))
  const suggestions = new Map()
  for (const line of text.split(/\r?\n/)) {
    const normalizedLine = line.replace(/[\s*_`-]+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const match = normalizedLine.match(/\bNGAY\s*(\d+)\s+(TRUA|TOI)\s*:\s*(.+)/i)
    if (!match) continue
    const slot = slots.get(`${Number(match[1])}:${match[2].toUpperCase()}`)
    if (!slot || suggestions.has(slot.id)) continue
    const name = line.slice(line.indexOf(':') + 1).replace(/[*_`]/g, '').split('|')[0].trim().slice(0, 100)
    const normalizedName = normalizePlaceText(name)
    if (normalizedName.length < 4 || /^(?:khong|chua|quan an|nha hang|dia phuong)$/.test(normalizedName)) continue
    suggestions.set(slot.id, name)
  }
  if (!suggestions.size) return plan
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => {
        const name = suggestions.get(activity.id)
        if (!name) return activity
        const meal = activity.id.endsWith('-lunch') ? 'Ăn trưa' : 'Ăn tối'
        const query = `${name}, ${day.destination || plan.form.destination}, Việt Nam`
        return {
          ...activity,
          title: `${meal} tại ${name}`,
          note: '',
          source: 'Gemini',
          sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
        }
      }),
    })),
  }
}

export function applyGroundedRestaurants(plan, candidate) {
  const text = candidate?.content?.parts?.map((part) => part.text || '').join('\n') || ''
  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.maps)
    .filter((maps) => maps?.title && isGoogleMapsUrl(maps.uri))
  if (!text || !sources.length) return plan

  const slots = new Map(mealSlots(plan).map((slot) => [`${slot.day}:${slot.meal}`, slot]))
  const suggestions = new Map()
  const usedUrls = new Set()
  for (const line of text.split(/\r?\n/)) {
    const normalizedLine = line.replace(/[\s*_`-]+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const match = normalizedLine.match(/\bNGAY\s*(\d+)\s+(TRUA|TOI)\s*:\s*(.+)/i)
    if (!match) continue
    const slot = slots.get(`${Number(match[1])}:${match[2].toUpperCase()}`)
    if (!slot || suggestions.has(slot.id)) continue
    const suggestedName = normalizePlaceText(match[3])
    const source = sources.find((item) => {
      const name = normalizePlaceText(item.title)
      return name.length >= 3 && (suggestedName.includes(name) || name.includes(suggestedName)) && !usedUrls.has(item.uri)
    })
    if (!source) continue
    suggestions.set(slot.id, source)
    usedUrls.add(source.uri)
  }

  if (!suggestions.size) return plan
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => {
        const source = suggestions.get(activity.id)
        if (!source) return activity
        const meal = activity.id.endsWith('-lunch') ? 'Ăn trưa' : 'Ăn tối'
        return {
          ...activity,
          title: `${meal} tại ${source.title.slice(0, 100)}`,
          note: 'Gemini gợi ý quán theo khu vực và nguồn Google Maps. Xem điểm sao, nhận xét hiện tại tại liên kết bên trên. Giá bữa ăn là dự toán, chưa xác minh theo thực đơn.',
          source: 'Google Maps',
          sourceUrl: source.uri,
          placeId: /^places\/[A-Za-z0-9_-]{6,}$/.test(source.placeId || '') ? source.placeId : undefined,
        }
      }),
    })),
  }
}

async function requestRestaurants(prompt, model, apiKey, useMapsGrounding, options) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await (options.fetchImpl || fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(useMapsGrounding ? { tools: [{ googleMaps: {} }] } : {}),
        generationConfig: { temperature: 0.2, maxOutputTokens: 1100 },
      }),
    })
    if (!response.ok) return null
    const payload = await response.json()
    return payload.candidates?.[0] || null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function suggestRestaurants(plan, env, options = {}) {
  if (!env.geminiApiKey || !mealSlots(plan).length) return plan
  if (env.useMapsGrounding) {
    const candidate = await requestRestaurants(buildRestaurantPrompt(plan), env.geminiModel, env.geminiApiKey, true, options)
    plan = applyGroundedRestaurants(plan, candidate)
  }
  if (!mealSlots(plan).length) return plan
  const candidate = await requestRestaurants(
    buildUnverifiedRestaurantPrompt(plan), env.geminiFallbackModel || env.geminiModel,
    env.geminiApiKey, false, options,
  )
  return applyUnverifiedRestaurants(plan, candidate)
}
