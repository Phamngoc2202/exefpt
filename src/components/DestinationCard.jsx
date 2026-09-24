import { ArrowRight, ArrowUpRight, WalletCards } from 'lucide-react'
import { destinationImages } from '../data/destinationImages'

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export default function DestinationCard({ destination, index, estimate, onPlan, onPreview }) {
  const tilt = (event) => {
    if (event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 4}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${x * 4}deg`)
  }
  const resetTilt = (event) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
  }

  return <article className="destination-card" onPointerMove={tilt} onPointerLeave={resetTilt} onMouseEnter={() => onPreview(destination.city)}>
    <img src={destinationImages[destination.city]} alt="" loading="lazy" />
    <span className="image-shade" />
    <span className="destination-number">0{index + 1} / MIỀN BẮC</span>
    <div className="destination-content">
      <small>{destination.minDays}–5 ngày khám phá</small>
      <strong>{destination.city}</strong>
      <span>{destination.meta}</span>
      <span className="destination-estimate"><WalletCards size={14} /> Mẫu {destination.minDays} ngày, 1 người: khoảng {money(estimate)}*</span>
      <div className="destination-actions">
        <button type="button" onClick={() => onPlan(destination.city)}>Lên kế hoạch <ArrowRight size={15} /></button>
        <a href={destination.guideUrl} target="_blank" rel="noreferrer">Xem điểm đến <ArrowUpRight size={14} /></a>
      </div>
    </div>
  </article>
}
