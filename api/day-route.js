import { findDestination } from '../src/data/northernDestinations.js'
import { resolvePlaceByName } from '../src/lib/placeSearch.js'

const OSRM_URL = 'https://router.project-osrm.org'
const CACHE_TTL = 60 * 60 * 1000
const MAX_BODY_SIZE = 16_000
const MAX_ACTIVITIES = 4
const routeCache = new Map()

function sendJson(response, status, payload, cacheStatus = 'BYPASS') {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  response.setHeader('X-TripGenie-Route-Cache', cacheStatus)
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

function radians(degrees) {
  return degrees * Math.PI / 180
}

function distanceInKm(from, to) {
  const latitudeDelta = radians(to.lat - from.lat)
  const longitudeDelta = radians(to.lng - from.lng)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function validCoordinates(value, destination) {
  const coordinates = { lat: Number(value?.lat), lng: Number(value?.lng) }
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return null
  return distanceInKm(destination.coordinates, coordinates) <= 45 ? coordinates : null
}

function cleanActivities(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map((activity) => ({
      id: String(activity?.id || '').slice(0, 100),
      title: String(activity?.title || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      searchName: String(activity?.searchName || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      coordinates: activity?.coordinates,
    }))
    .filter((activity) => {
      const key = activity.title.toLocaleLowerCase('vi-VN')
      if (!activity.title || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_ACTIVITIES)
}

export function parseOsrmTrip(payload, inputPlaces) {
  const trip = payload?.trips?.[0]
  if (payload?.code !== 'Ok' || !trip?.geometry?.coordinates?.length) throw new Error('no_route')
  const orderedPlaces = inputPlaces
    .map((place, index) => ({ ...place, order: Number(payload.waypoints?.[index]?.waypoint_index) || 0 }))
    .sort((a, b) => a.order - b.order)
  const legs = (trip.legs || []).map((leg, index) => ({
    from: orderedPlaces[index]?.title || '',
    to: orderedPlaces[index + 1]?.title || '',
    distanceKm: Math.round((Number(leg.distance) || 0) / 100) / 10,
    durationMinutes: Math.max(1, Math.round((Number(leg.duration) || 0) / 60)),
  }))
  return {
    places: orderedPlaces,
    geometry: trip.geometry,
    distanceKm: Math.round((Number(trip.distance) || 0) / 100) / 10,
    durationMinutes: Math.max(1, Math.round((Number(trip.duration) || 0) / 60)),
    legs,
    provider: 'OSRM · OpenStreetMap',
    estimated: false,
  }
}

export function buildFallbackRoute(places) {
  let distanceKm = 0
  const legs = places.slice(0, -1).map((place, index) => {
    const next = places[index + 1]
    const distance = distanceInKm(place.coordinates, next.coordinates)
    distanceKm += distance
    return {
      from: place.title,
      to: next.title,
      distanceKm: Math.round(distance * 10) / 10,
      durationMinutes: Math.max(1, Math.round(distance / 25 * 60)),
    }
  })
  return {
    places,
    geometry: { type: 'LineString', coordinates: places.map((place) => [place.coordinates.lng, place.coordinates.lat]) },
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.max(1, Math.round(distanceKm / 25 * 60)),
    legs,
    provider: 'Ước tính theo khoảng cách',
    estimated: true,
  }
}

async function resolveActivities(activities, destination) {
  const places = []
  const unresolved = []
  for (const activity of activities) {
    const providedCoordinates = validCoordinates(activity.coordinates, destination)
    const catalogActivity = destination.activities.find((item) => item.title === activity.title)
    const catalogCoordinates = validCoordinates(catalogActivity?.coordinates, destination)
    const searchName = activity.searchName || catalogActivity?.searchName || catalogActivity?.aliases?.[0] || activity.title
    const resolved = providedCoordinates || catalogCoordinates
      ? { coordinates: providedCoordinates || catalogCoordinates, location: activity.title }
      : await resolvePlaceByName(searchName, destination)
    if (!resolved?.coordinates) {
      unresolved.push(activity.title)
      continue
    }
    places.push({ id: activity.id, title: activity.title, location: resolved.location || activity.title, coordinates: resolved.coordinates })
  }
  return { places, unresolved }
}

export function createDayRouteHandler(overrides = {}) {
  return async function dayRouteHandler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }
    try {
      const body = await readJsonBody(request)
      const destination = findDestination(String(body.city || ''))
      if (!destination?.coordinates) {
        sendJson(response, 400, { error: 'Điểm đến không được hỗ trợ.' })
        return
      }
      const activities = cleanActivities(body.activities)
      if (!activities.length) {
        sendJson(response, 200, { places: [], legs: [], warning: 'Ngày này chưa có địa điểm để tính tuyến.' })
        return
      }
      const { places, unresolved } = await resolveActivities(activities, destination)
      if (places.length < 2) {
        sendJson(response, 200, { places, legs: [], unresolved, warning: 'Cần ít nhất hai địa điểm xác định được tọa độ để tính tuyến.' })
        return
      }

      const cacheKey = places.map((place) => `${place.coordinates.lng.toFixed(5)},${place.coordinates.lat.toFixed(5)}`).join(';')
      const cached = routeCache.get(cacheKey)
      if (cached?.expiresAt > Date.now()) {
        sendJson(response, 200, { ...cached.payload, unresolved }, 'HIT')
        return
      }
      const coordinatePath = places.map((place) => `${place.coordinates.lng},${place.coordinates.lat}`).join(';')
      const fetchImpl = overrides.fetchImpl || fetch
      let route
      try {
        const routeResponse = await fetchImpl(`${OSRM_URL}/trip/v1/driving/${coordinatePath}?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson&steps=false`, {
          headers: { 'User-Agent': 'TripGenie/1.0 (+https://github.com/Phamngoc2202/exefpt)' },
          signal: AbortSignal.timeout(8000),
        })
        if (!routeResponse.ok) throw new Error(`OSRM responded with ${routeResponse.status}`)
        route = parseOsrmTrip(await routeResponse.json(), places)
      } catch {
        route = buildFallbackRoute(places)
      }
      const payload = { ...route, unresolved, warning: route.estimated ? 'Dịch vụ tuyến đường đang bận; thời gian hiện tại là ước tính.' : '' }
      routeCache.set(cacheKey, { payload, expiresAt: Date.now() + CACHE_TTL })
      sendJson(response, 200, payload, 'MISS')
    } catch (error) {
      const status = error.message === 'request_too_large' ? 413 : error instanceof SyntaxError ? 400 : 502
      sendJson(response, status, { error: status === 502 ? 'Chưa thể tính tuyến đường lúc này.' : 'Dữ liệu tuyến đường không hợp lệ.' })
    }
  }
}

export default createDayRouteHandler()
