const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_REQUESTED_PLACES = 4
const MAX_DISTANCE_KM = 45
const cache = new Map()
let requestQueue = Promise.resolve()
let lastRequestAt = 0

export function normalizePlaceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanPlaceName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export function placeNameFromActivityTitle(value) {
  return cleanPlaceName(value)
    .replace(/^(?:tour\s+)?(?:tham quan|khám phá|dạo quanh|dạo|ngắm cảnh|ngắm|trải nghiệm|đi thuyền|leo núi|đạp xe quanh|chèo)\s+/i, '')
    .replace(/^di tích\s+/i, '')
}

export function sanitizeRequestedPlaces(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map(cleanPlaceName)
    .filter((name) => {
      const normalized = normalizePlaceText(name)
      if (normalized.length < 3 || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
    .slice(0, MAX_REQUESTED_PLACES)
}

function distanceInKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.lat - from.lat)
  const longitudeDelta = radians(to.lng - from.lng)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isKnownPlace(name, activities = []) {
  const normalizedName = normalizePlaceText(name)
  return activities.some((activity) => [activity.title, ...(activity.aliases || [])].some((candidate) => {
    const normalizedCandidate = normalizePlaceText(candidate)
    return normalizedCandidate && (normalizedName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedName))
  }))
}

function resultMatchesPlaceName(name, displayName, destinationName) {
  const destinationTokens = new Set(normalizePlaceText(destinationName).split(' ').filter(Boolean))
  const queryTokens = normalizePlaceText(name).split(' ')
    .filter((token) => token.length >= 2 && !destinationTokens.has(token))
  if (!queryTokens.length) return true
  const resultTokens = new Set(normalizePlaceText(displayName).split(' ').filter(Boolean))
  const matchingTokens = queryTokens.filter((token) => resultTokens.has(token)).length
  return matchingTokens >= Math.max(1, Math.ceil(queryTokens.length / 2))
}

async function rateLimitedFetch(task, enabled) {
  if (!enabled) return task()
  const run = requestQueue.then(async () => {
    const wait = Math.max(0, 1000 - (Date.now() - lastRequestAt))
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    lastRequestAt = Date.now()
    return task()
  })
  requestQueue = run.catch(() => {})
  return run
}

function toActivity(name, result, suggestedDay) {
  const latitude = Number(result.lat)
  const longitude = Number(result.lon)
  const osmType = { N: 'node', W: 'way', R: 'relation' }[result.osm_type?.[0]?.toUpperCase()] || result.osm_type
  const sourceUrl = osmType && result.osm_id
    ? `https://www.openstreetmap.org/${osmType}/${result.osm_id}`
    : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
  return {
    title: `Tham quan ${name}`,
    aliases: [name],
    costPerPerson: 0,
    tags: ['Văn hóa', 'Chụp ảnh'],
    suggestedDay,
    note: 'Địa điểm theo yêu cầu đã được đối chiếu trên OpenStreetMap; chi phí vé và giờ mở cửa chưa được xác minh.',
    type: 'place',
    location: result.display_name || name,
    coordinates: { lat: latitude, lng: longitude },
    source: 'OpenStreetMap',
    sourceUrl,
    external: true,
  }
}

async function searchOnePlace(name, destination, fetchImpl, rateLimit) {
  const cacheKey = `${normalizePlaceText(destination.city)}:${normalizePlaceText(name)}`
  const cached = cache.get(cacheKey)
  if (cached?.expiresAt > Date.now()) return cached.activity

  const params = new URLSearchParams({
    q: `${name}, ${destination.city}, Việt Nam`,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'vn',
    limit: '3',
  })
  const results = await rateLimitedFetch(async () => {
    const response = await fetchImpl(`${NOMINATIM_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'vi',
        'User-Agent': 'TripGenie/1.0 (+https://github.com/Phamngoc2202/exefpt)',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`)
    return response.json()
  }, rateLimit)

  const result = (Array.isArray(results) ? results : []).find((item) => {
    const coordinates = { lat: Number(item.lat), lng: Number(item.lon) }
    return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
      && distanceInKm(destination.coordinates, coordinates) <= MAX_DISTANCE_KM
      && resultMatchesPlaceName(name, item.display_name, destination.city)
  })
  const activity = result ? toActivity(name, result, 1) : null
  cache.set(cacheKey, { activity, expiresAt: Date.now() + CACHE_TTL })
  return activity
}

export async function resolvePlaceByName(name, destination, options = {}) {
  if (!destination?.coordinates) return null
  const cityPattern = String(destination.city || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cleanedName = placeNameFromActivityTitle(name).replace(new RegExp(`\\s+${cityPattern}$`, 'i'), '')
  if (!cleanedName) return null
  return searchOnePlace(cleanedName, destination, options.fetchImpl || fetch, options.rateLimit !== false)
}

export async function resolveRequestedPlaces(values, destination, options = {}) {
  if (!destination?.coordinates) return { activities: [], unresolved: [] }
  const names = sanitizeRequestedPlaces(values)
  const unknownNames = names.filter((name) => !isKnownPlace(name, destination.activities))
  const activities = []
  const unresolved = []

  for (const [index, name] of unknownNames.entries()) {
    try {
      const activity = await searchOnePlace(name, destination, options.fetchImpl || fetch, options.rateLimit !== false)
      if (activity) activities.push({ ...activity, suggestedDay: index + 1 })
      else unresolved.push(name)
    } catch {
      unresolved.push(name)
    }
  }

  return { activities, unresolved }
}
