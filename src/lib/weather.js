const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_TTL = 30 * 60 * 1000
const forecastCache = new Map()

const weatherDescriptions = [
  [[0], 'Trời quang', '☀️'],
  [[1, 2], 'Ít mây', '🌤️'],
  [[3], 'Nhiều mây', '☁️'],
  [[45, 48], 'Có sương mù', '🌫️'],
  [[51, 53, 55, 56, 57], 'Mưa phùn', '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Có mưa', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Có tuyết', '🌨️'],
  [[95, 96, 99], 'Có dông', '⛈️'],
]

export function describeWeatherCode(code) {
  const match = weatherDescriptions.find(([codes]) => codes.includes(Number(code)))
  return match ? { label: match[1], icon: match[2] } : { label: 'Thời tiết thay đổi', icon: '🌤️' }
}

export function normalizeWeatherPayload(payload) {
  const daily = payload?.daily
  if (!Array.isArray(daily?.time)) return {}

  return Object.fromEntries(daily.time.map((date, index) => {
    const condition = describeWeatherCode(daily.weather_code?.[index])
    return [date, {
      date,
      ...condition,
      min: Math.round(daily.temperature_2m_min?.[index]),
      max: Math.round(daily.temperature_2m_max?.[index]),
      rain: Math.round(daily.precipitation_probability_max?.[index] || 0),
      wind: Math.round(daily.wind_speed_10m_max?.[index] || 0),
    }]
  }))
}

export async function fetchWeatherForecast(coordinates) {
  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    throw new Error('missing_coordinates')
  }

  const cacheKey = `${coordinates.lat},${coordinates.lng}`
  const cached = forecastCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const params = new URLSearchParams({
    latitude: String(coordinates.lat),
    longitude: String(coordinates.lng),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'Asia/Ho_Chi_Minh',
    forecast_days: '16',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  const promise = fetch(`${OPEN_METEO_URL}?${params}`, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error('weather_unavailable')
      return response.json()
    })
    .then(normalizeWeatherPayload)
    .finally(() => clearTimeout(timeout))

  forecastCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, promise })
  promise.catch(() => forecastCache.delete(cacheKey))
  return promise
}
