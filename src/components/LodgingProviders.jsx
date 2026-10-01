import { useEffect, useState } from 'react'
import { BedDouble, CalendarDays, ExternalLink, MapPin, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { stayAreasByDestination } from '../data/stayAreas'
import { buildLodgingProviderLinks } from '../lib/lodgingProviders'
import { countTripDays, formatTripDate } from '../lib/tripPlanner'

export default function LodgingProviders({ form }) {
  const [state, setState] = useState({ status: 'loading', places: [] })
  const nights = Math.max(0, countTripDays(form.startDate, form.endDate) - 1)
  const { rooms, providers } = buildLodgingProviderLinks(form)
  const areas = stayAreasByDestination[form.destination] || []

  useEffect(() => {
    if (nights < 1) return undefined
    let active = true
    setState({ status: 'loading', places: [] })
    fetch(`/api/accommodations?city=${encodeURIComponent(form.destination)}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'accommodations_unavailable')
        if (active) setState({ status: 'ready', places: payload.places || [] })
      })
      .catch(() => {
        if (active) setState({ status: 'error', places: [] })
      })
    return () => { active = false }
  }, [form.destination, nights])

  if (nights < 1) return null

  return <section className="lodging-provider-card">
    <div className="lodging-provider-heading"><span><BedDouble size={18} /></span><div><small>LƯU TRÚ QUA ĐÊM</small><strong>Tìm nơi ở tại {form.destination}</strong></div></div>
    <div className="lodging-stay-summary">
      <span><CalendarDays size={13} /> {formatTripDate(form.startDate)} – {formatTripDate(form.endDate)}</span>
      <span><strong>{nights}</strong> đêm · <strong>{rooms}</strong> phòng · <Users size={13} /> {form.travelers} khách</span>
    </div>
    <div className="stay-area-list"><small>KHU VỰC NÊN Ở</small><div>{areas.map((area) => <span key={area}><MapPin size={11} /> {area}</span>)}</div></div>

    <div className="lodging-results">
      <div className="lodging-results-title"><strong>Địa điểm từ OpenStreetMap</strong><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Nguồn dữ liệu ↗</a></div>
      {state.status === 'loading' && <div className="lodging-loading"><RefreshCw className="spin" size={15} /> Đang tìm nơi lưu trú gần điểm đến...</div>}
      {state.status === 'error' && <p className="lodging-empty">Nguồn mở đang bận. Bạn vẫn có thể dùng khu vực gợi ý và các liên kết tìm phòng bên dưới.</p>}
      {state.status === 'ready' && state.places.length === 0 && <p className="lodging-empty">Chưa có địa điểm phù hợp trong dữ liệu mở quanh khu vực này.</p>}
      {state.status === 'ready' && state.places.slice(0, 4).map((place) => <article key={place.id}>
        <div><strong>{place.name}</strong><span>{place.type}</span></div>
        {place.address && <small><MapPin size={11} /> {place.address}</small>}
        <a href={place.website || place.osmUrl} target="_blank" rel="noreferrer">Xem thông tin <ExternalLink size={11} /></a>
      </article>)}
    </div>

    <div className="lodging-provider-links">
      {providers.map((provider) => <a key={provider.name} href={provider.url} target="_blank" rel="noreferrer"><span><ShieldCheck size={14} /> {provider.name}</span><strong>{provider.action} <ExternalLink size={12} /></strong></a>)}
    </div>
    <p className="lodging-provider-note">TripGenie không bán phòng và không nhận thanh toán. Giá, chính sách và phòng trống do nhà cung cấp cập nhật; hãy kiểm tra trước khi đặt.</p>
  </section>
}
