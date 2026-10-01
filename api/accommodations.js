import { findDestination } from '../src/data/northernDestinations.js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CACHE_TTL = 6 * 60 * 60 * 1000
const cache = new Map()

const typeLabels = {
  hotel: 'Khách sạn',
  hostel: 'Hostel',
  guest_house: 'Nhà nghỉ / homestay',
  apartment: 'Căn hộ lưu trú',
  motel: 'Nhà nghỉ',
}

function safeUrl(value) {
  return /^https?:\/\//i.test(value || '') ? value : null
}

function addressFrom(tags = {}) {
  if (tags['addr:full']) return tags['addr:full']
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [street, tags['addr:suburb'] || tags['addr:district']].filter(Boolean).join(', ')
}

export function parseOverpassAccommodations(payload) {
  const seen = new Set()
  return (Array.isArray(payload?.elements) ? payload.elements : [])
    .map((element) => {
      const tags = element.tags || {}
      const name = String(tags.name || tags['name:vi'] || '').trim()
      const latitude = element.lat ?? element.center?.lat
      const longitude = element.lon ?? element.center?.lon
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
      const key = name.toLocaleLowerCase('vi-VN')
      if (seen.has(key)) return null
      seen.add(key)
      return {
        id: `${element.type}-${element.id}`,
        name,
        type: typeLabels[tags.tourism] || 'Nơi lưu trú',
        address: addressFrom(tags),
        phone: tags.phone || tags['contact:phone'] || '',
        website: safeUrl(tags.website || tags['contact:website']),
        latitude,
        longitude,
        osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      }
    })
    .filter(Boolean)
    .slice(0, 8)
}

function sendJson(response, status, payload, cacheStatus) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
  response.setHeader('X-TripGenie-Accommodation-Cache', cacheStatus)
  response.end(JSON.stringify(payload))
}

export default async function accommodationsHandler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { places: [], error: 'Phương thức không được hỗ trợ.' }, 'BYPASS')
    return
  }

  const requestUrl = new URL(request.url || '/api/accommodations', 'http://localhost')
  const city = requestUrl.searchParams.get('city') || ''
  const destination = findDestination(city)
  if (!destination?.coordinates) {
    sendJson(response, 400, { places: [], error: 'Điểm đến không được hỗ trợ.' }, 'BYPASS')
    return
  }

  const cached = cache.get(city)
  if (cached?.expiresAt > Date.now()) {
    sendJson(response, 200, cached.payload, 'HIT')
    return
  }

  const { lat, lng } = destination.coordinates
  const query = `[out:json][timeout:12];(nwr(around:12000,${lat},${lng})[tourism~"^(hotel|hostel|guest_house|apartment|motel)$"][name];);out center tags 20;`

  try {
    const overpassResponse = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'TripGenie/1.0 (+https://github.com/Phamngoc2202/exefpt)',
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!overpassResponse.ok) throw new Error(`Overpass responded with ${overpassResponse.status}`)
    const places = parseOverpassAccommodations(await overpassResponse.json())
    const payload = { places, source: 'OpenStreetMap contributors', fetchedAt: new Date().toISOString() }
    cache.set(city, { payload, expiresAt: Date.now() + CACHE_TTL })
    sendJson(response, 200, payload, 'MISS')
  } catch (error) {
    if (cached?.payload) {
      sendJson(response, 200, { ...cached.payload, stale: true }, 'STALE')
      return
    }
    sendJson(response, 502, { places: [], error: 'Chưa tải được danh sách lưu trú.', detail: error.message }, 'ERROR')
  }
}
