import { useEffect, useState } from 'react'
import { CloudSun, Droplets, ShieldCheck, Wind } from 'lucide-react'
import { fetchWeatherForecast } from '../lib/weather'

function WeatherProvider({ syncedAt }) {
  const syncedLabel = syncedAt ? new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(syncedAt) : ''

  return <footer className="weather-provider">
    <div><ShieldCheck size={15} /><span>Nguồn:</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open‑Meteo ↗</a><small>Mô hình Best Match</small></div>
    <span>{syncedLabel ? `Đồng bộ ${syncedLabel}` : 'Dự báo tham khảo'}</span>
  </footer>
}

export default function TripWeather({ city, coordinates, date }) {
  const [forecast, setForecast] = useState(null)
  const [status, setStatus] = useState('loading')
  const [syncedAt, setSyncedAt] = useState(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetchWeatherForecast(coordinates)
      .then((result) => {
        if (!active) return
        setForecast(result)
        setSyncedAt(new Date())
        setStatus('ready')
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setStatus('error')
      })
    return () => { active = false }
  }, [coordinates])

  const weather = forecast?.[date]

  if (status === 'loading') {
    return <section className="trip-weather-card loading" aria-live="polite"><CloudSun size={22} /><span>Đang tải dự báo thời tiết cho {city}...</span></section>
  }

  if (status === 'error') {
    return <section className="trip-weather-card unavailable"><CloudSun size={22} /><div><strong>Chưa tải được thời tiết</strong><small>Lịch trình vẫn có thể sử dụng bình thường.</small></div></section>
  }

  if (!weather) {
    return <section className="trip-weather-card unavailable"><CloudSun size={22} /><div><strong>Chưa có dự báo cho ngày này</strong><small>Open‑Meteo chỉ cung cấp dự báo gần ngày khởi hành; hãy quay lại kiểm tra sau.</small></div></section>
  }

  const rainWarning = weather.rain >= 60 ? 'Khả năng mưa cao, nên chuẩn bị phương án trong nhà.' : weather.rain >= 30 ? 'Có thể có mưa, nên mang theo áo mưa.' : 'Thời tiết phù hợp để tiếp tục kế hoạch.'

  return <section className="trip-weather-card" aria-label={`Dự báo thời tiết ${city} ngày ${date}`}>
    <div className="weather-condition"><span aria-hidden="true">{weather.icon}</span><div><small>Dự báo tại {city}</small><strong>{weather.label}</strong></div></div>
    <div className="weather-temperature"><strong>{weather.max}°</strong><span>Thấp nhất {weather.min}°C</span></div>
    <div className="weather-metric"><Droplets size={17} /><span><strong>{weather.rain}%</strong><small>Khả năng mưa</small></span></div>
    <div className="weather-metric"><Wind size={17} /><span><strong>{weather.wind} km/h</strong><small>Gió lớn nhất</small></span></div>
    <p className={weather.rain >= 60 ? 'weather-advice warning' : 'weather-advice'}>{rainWarning}</p>
    <WeatherProvider syncedAt={syncedAt} />
  </section>
}
