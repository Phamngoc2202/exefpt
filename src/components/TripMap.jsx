import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Clock3, Navigation, Route } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const HANOI = { lat: 21.0278, lng: 105.8342 }

function addPoint(map, coordinates, label, color) {
  return L.circleMarker([coordinates.lat, coordinates.lng], {
    radius: 8,
    color: '#ffffff',
    weight: 3,
    fillColor: color,
    fillOpacity: 1,
  }).addTo(map).bindTooltip(label, { direction: 'top', offset: [0, -7] })
}

export default function TripMap({ city, coordinates, origin = 'Hà Nội', originCoordinates = HANOI, day }) {
  const containerRef = useRef(null)
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const routeActivities = useMemo(() => (day?.activities || [])
    .filter((activity) => activity.category === 'Hoạt động')
    .map(({ id, title, searchName, coordinates: activityCoordinates }) => ({ id, title, searchName, coordinates: activityCoordinates })), [day])
  const routeKey = JSON.stringify(routeActivities)

  useEffect(() => {
    const controller = new AbortController()
    if (!city || !routeActivities.length) {
      setRoute(null)
      return () => controller.abort()
    }
    setLoading(true)
    fetch('/api/day-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, activities: routeActivities }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Không tải được tuyến đường.')
        setRoute(payload)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRoute({ error: error.message, places: [], legs: [] })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [city, routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current || !coordinates) return undefined
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const destinationPoint = [coordinates.lat, coordinates.lng]
    const boundsPoints = []
    if (city === 'Hà Nội' || origin === city) {
      addPoint(map, coordinates, city, '#087e83')
      boundsPoints.push(destinationPoint)
    } else {
      addPoint(map, originCoordinates, origin, '#f0a75a')
      addPoint(map, coordinates, city, '#087e83')
      boundsPoints.push([originCoordinates.lat, originCoordinates.lng], destinationPoint)
      if (!route?.geometry) L.polyline([[originCoordinates.lat, originCoordinates.lng], destinationPoint], { color: '#087e83', weight: 3, opacity: 0.6, dashArray: '7 8' }).addTo(map)
    }

    ;(route?.places || []).forEach((place, index) => {
      addPoint(map, place.coordinates, `${index + 1}. ${place.title}`, '#d77d35')
      boundsPoints.push([place.coordinates.lat, place.coordinates.lng])
    })
    if (route?.geometry?.coordinates?.length) {
      L.geoJSON(route.geometry, { style: { color: '#087e83', weight: 5, opacity: 0.82 } }).addTo(map)
    }
    if (boundsPoints.length > 1) map.fitBounds(boundsPoints, { padding: [26, 26], maxZoom: 14 })
    else map.setView(destinationPoint, 12)

    window.setTimeout(() => map.invalidateSize(), 0)
    return () => map.remove()
  }, [city, coordinates, origin, originCoordinates, route])

  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=11/${coordinates.lat}/${coordinates.lng}`
    : 'https://www.openstreetmap.org/'

  return <section className="trip-map-card">
    <div className="trip-map-heading"><div><span>TUYẾN ĐƯỜNG NGÀY {day?.day || 1}</span><strong>{city} · {route?.estimated ? 'thời gian ước tính' : 'đường đi thực tế'}</strong></div><a href={mapUrl} target="_blank" rel="noreferrer">Mở bản đồ ↗</a></div>
    <div ref={containerRef} className="trip-map" aria-label={`Bản đồ hoạt động ngày ${day?.day || 1} tại ${city}`} />
    <div className="trip-route-summary">
      {loading ? <p>Đang tính tuyến đường và thời gian di chuyển...</p> : route?.distanceKm != null ? <>
        <div className="trip-route-totals"><span><Route size={14} /><strong>{route.distanceKm} km</strong></span><span><Clock3 size={14} /><strong>{route.durationMinutes} phút</strong></span></div>
        {route.legs?.length > 0 && <div className="trip-route-legs">{route.legs.map((leg, index) => <div key={`${leg.from}-${leg.to}`}><span>{index + 1}</span><p><strong>{leg.from} → {leg.to}</strong><small><Navigation size={11} /> {leg.distanceKm} km · khoảng {leg.durationMinutes} phút</small></p></div>)}</div>}
        <small>Nguồn tuyến: {route.provider}. Chưa bao gồm tình trạng giao thông trực tiếp.</small>
        {route.warning && <em>{route.warning}</em>}
      </> : <p>{route?.error || route?.warning || 'Chưa đủ địa điểm để tính tuyến đường trong ngày.'}</p>}
    </div>
  </section>
}
