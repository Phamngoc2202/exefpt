import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CloudSun, Compass, Droplets, MapPin, ShieldCheck, WalletCards, Wind } from 'lucide-react'
import { destinationDetails } from '../data/destinationDetails'
import { destinationImageCredits, destinationImages, destinationImageSets } from '../data/destinationImages'
import { findDestination } from '../data/northernDestinations'
import { addDays, createDefaultForm, generatePlan, summarizePlan } from '../lib/tripPlanner'
import { fetchWeatherForecast } from '../lib/weather'
import './destination-detail.css'

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

function buildSample(destination, travelers = 2) {
  const form = createDefaultForm()
  const duration = Math.max(2, Math.min(3, destination.minDays))
  form.destination = destination.city
  form.endDate = addDays(form.startDate, duration - 1)
  form.travelers = travelers
  form.travelWith = travelers === 1 ? 'Một mình' : travelers === 2 ? 'Cặp đôi' : 'Gia đình'
  form.budget = 15000000
  return generatePlan(form)
}

function DestinationWeather({ destination }) {
  const [state, setState] = useState({ status: 'loading', weather: null })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', weather: null })
    fetchWeatherForecast(destination.coordinates)
      .then((forecast) => {
        if (!active) return
        setState({ status: 'ready', weather: Object.values(forecast)[0] || null })
      })
      .catch(() => { if (active) setState({ status: 'error', weather: null }) })
    return () => { active = false }
  }, [destination])

  if (state.status === 'loading') return <div className="destination-weather is-loading"><CloudSun size={24} /><span>Đang tải thời tiết…</span></div>
  if (!state.weather) return <div className="destination-weather is-loading"><CloudSun size={24} /><span>Chưa có dự báo gần nhất</span></div>

  const weather = state.weather
  return <div className="destination-weather">
    <div className="destination-weather-main"><span aria-hidden="true">{weather.icon}</span><div><small>Thời tiết gần nhất</small><strong>{weather.label}</strong></div></div>
    <div><strong>{weather.max}°</strong><small>Thấp nhất {weather.min}°</small></div>
    <div><Droplets size={16} /><strong>{weather.rain}%</strong><small>Khả năng mưa</small></div>
    <div><Wind size={16} /><strong>{weather.wind} km/h</strong><small>Gió lớn nhất</small></div>
  </div>
}

export default function DestinationDetailPage({ city, onBack, onPlan }) {
  const destination = findDestination(city) || findDestination('Ninh Bình')
  const details = destinationDetails[destination.city]
  const imageSet = destinationImageSets[destination.city]
  const credit = destinationImageCredits[destination.city]
  const samplePlan = useMemo(() => buildSample(destination), [destination])
  const budgetSamples = useMemo(() => [1, 2, 4].map((travelers) => ({
    travelers,
    amount: summarizePlan(buildSample(destination, travelers)).planned,
  })), [destination])
  const mapDelta = { lat: 0.09, lng: 0.13 }
  const { lat, lng } = destination.coordinates
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - mapDelta.lng}%2C${lat - mapDelta.lat}%2C${lng + mapDelta.lng}%2C${lat + mapDelta.lat}&layer=mapnik&marker=${lat}%2C${lng}`
  const highlights = destination.activities.filter((activity) => activity.type === 'place').slice(0, 6)

  return <main className="destination-detail-page">
    <section className="destination-detail-hero">
      <img
        src={destinationImages[destination.city]}
        srcSet={imageSet ? `${imageSet.small} 800w, ${imageSet.large} 1600w` : undefined}
        sizes="100vw"
        width="1600"
        height="1067"
        alt={`Phong cảnh ${destination.city}`}
        fetchPriority="high"
      />
      <div className="destination-detail-shade" />
      <div className="page-shell destination-detail-hero-content">
        <button type="button" className="destination-back" onClick={onBack}><ArrowLeft size={17} /> Trở lại khám phá</button>
        <span className="destination-detail-kicker">TRIPGENIE / ĐIỂM ĐẾN MIỀN BẮC</span>
        <h1>{destination.city}</h1>
        <p>{details.summary}</p>
        <div className="destination-detail-meta">
          <span><CalendarDays size={17} /><strong>{destination.minDays}–5 ngày</strong><small>Thời lượng gợi ý</small></span>
          <span><Compass size={17} /><strong>{details.bestTime}</strong><small>Thời điểm nên đi</small></span>
          <span><MapPin size={17} /><strong>{details.suitableFor}</strong><small>Phù hợp với</small></span>
        </div>
        <button type="button" className="destination-plan-main" onClick={() => onPlan(destination.city)}>Tạo chuyến đến {destination.city} <ArrowRight size={18} /></button>
      </div>
      {credit && <a className="destination-detail-credit" href={credit.url} target="_blank" rel="noreferrer">Ảnh: {credit.label}</a>}
    </section>

    <div className="page-shell destination-detail-body">
      <section className="destination-detail-section destination-overview" aria-labelledby="destination-overview-heading">
        <div className="destination-section-heading"><span>01 / TỔNG QUAN</span><h2 id="destination-overview-heading">Biết trước để <em>đi trọn vẹn.</em></h2></div>
        <div className="destination-overview-grid">
          <DestinationWeather destination={destination} />
          <aside className="destination-tip"><ShieldCheck size={23} /><div><strong>Lưu ý từ TripGenie</strong><p>{details.tip}</p></div></aside>
        </div>
      </section>

      <section className="destination-detail-section" aria-labelledby="destination-highlights-heading">
        <div className="destination-section-heading"><span>02 / NỔI BẬT</span><h2 id="destination-highlights-heading">Những nơi đáng <em>dừng chân.</em></h2></div>
        <div className="destination-highlight-grid">{highlights.map((activity, index) => <article key={activity.title}>
          <span>{String(index + 1).padStart(2, '0')}</span><MapPin size={21} /><h3>{activity.title}</h3><p>{activity.note || 'Một điểm dừng phù hợp để thêm vào lịch trình khám phá.'}</p>
        </article>)}</div>
      </section>

      <section className="destination-detail-section destination-gallery-section" aria-labelledby="destination-gallery-heading">
        <div className="destination-section-heading"><span>03 / HÌNH ẢNH</span><h2 id="destination-gallery-heading">Nhìn gần hơn về <em>{destination.city}.</em></h2><p>Chọn một ảnh để xem bản gốc và thông tin giấy phép trên Wikimedia Commons.</p></div>
        <div className="destination-gallery-grid">{details.gallery.map((photo) => <a key={photo.source} href={photo.source} target="_blank" rel="noreferrer" aria-label={`Xem ảnh gốc: ${photo.title}`}>
          <img src={photo.src} alt={photo.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          <span><span><strong>{photo.title}</strong><small>{photo.credit}</small></span><ArrowUpRight size={18} /></span>
        </a>)}</div>
      </section>

      <section className="destination-detail-section destination-budget-section" aria-labelledby="destination-budget-heading">
        <div className="destination-section-heading"><span>04 / NGÂN SÁCH MẪU</span><h2 id="destination-budget-heading">Ước tính để <em>dễ lựa chọn.</em></h2><p>Mức cân bằng cho hành trình {samplePlan.days.length} ngày, khởi hành từ Hà Nội; chưa phải giá đặt chỗ thực tế.</p></div>
        <div className="destination-budget-grid">{budgetSamples.map((sample) => <article key={sample.travelers}><WalletCards size={21} /><span>{sample.travelers} người</span><strong>{money(sample.amount)}</strong><small>Chi phí dự kiến</small></article>)}</div>
      </section>

      <section className="destination-detail-section destination-sample-section" aria-labelledby="destination-sample-heading">
        <div className="destination-section-heading"><span>05 / LỊCH TRÌNH MẪU</span><h2 id="destination-sample-heading">Một hành trình <em>có thể bắt đầu.</em></h2></div>
        <div className="destination-sample-days">{samplePlan.days.map((day) => {
          const places = day.activities.filter((activity) => activity.category === 'Hoạt động')
          return <article key={day.day}><span>Ngày {day.day}</span><h3>{day.label}</h3><ul>{places.map((activity) => <li key={activity.id}><time>{activity.time}</time>{activity.title}</li>)}</ul></article>
        })}</div>
      </section>

      <section className="destination-detail-section destination-map-section" aria-labelledby="destination-map-heading">
        <div className="destination-section-heading"><span>06 / VỊ TRÍ</span><h2 id="destination-map-heading">Đặt chân lên <em>bản đồ.</em></h2></div>
        <div className="destination-map-wrap"><iframe title={`Bản đồ ${destination.city}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /><div><strong>{destination.city}</strong><span>{destination.meta}</span><a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=10/${lat}/${lng}`} target="_blank" rel="noreferrer">Mở bản đồ lớn <ArrowUpRight size={15} /></a></div></div>
      </section>

      <section className="destination-detail-cta">
        <div><span>SẴN SÀNG KHỞI HÀNH?</span><h2>Biến cảm hứng thành<br /><em>lịch trình của riêng bạn.</em></h2></div>
        <div><button type="button" onClick={() => onPlan(destination.city)}>Tạo chuyến đến {destination.city} <ArrowRight size={18} /></button><a href={destination.guideUrl} target="_blank" rel="noreferrer">Đọc thêm tại Vietnam Tourism <ArrowUpRight size={15} /></a></div>
      </section>
    </div>
  </main>
}
