import { ArrowUpRight, MapPin } from 'lucide-react'

// Interactive HTML stays on top of the single persistent WebGL canvas.
// These editorial positions match the original TripGenie scene, not a map scale.
const markerLayout = {
  'Hà Nội': { left: '43%', top: '78%' },
  'Hạ Long': { left: '72%', top: '79%' },
  'Ninh Bình': { left: '51%', top: '88%' },
  'Sa Pa': { left: '25%', top: '69%' },
  'Hà Giang': { left: '64%', top: '69%' },
}

export default function TravelScene({ destinations, activeDestination, onHover, onSelect }) {
  const selected = destinations.find((destination) => destination.city === activeDestination) || destinations[0]

  return <div className="travel-scene is-persistent">
    <div className="travel-scene-fallback" role="img" aria-label="Phong cảnh miền Bắc Việt Nam" />
    <div className="travel-scene-sheen" aria-hidden="true" />
    <div className="scene-markers" aria-label="Chọn điểm đến miền Bắc">
      {destinations.map((destination, index) => {
        const position = destinations.length === 1 ? 0.5 : index / (destinations.length - 1)
        const style = markerLayout[destination.city] || { left: `${19 + position * 60}%`, top: `${72 + Math.sin(position * Math.PI * 1.7) * 8}%` }
        return <button
          type="button"
          key={destination.city}
          className={destination.city === activeDestination ? 'scene-marker active' : 'scene-marker'}
          style={style}
          onMouseEnter={() => onHover(destination.city)}
          onFocus={() => onHover(destination.city)}
          onClick={() => onSelect(destination.city)}
          aria-label={`Lên kế hoạch đi ${destination.city}`}
        ><span className="marker-core"><MapPin size={13} /></span><span className="marker-name">{destination.city}</span></button>
      })}
      <span className="scene-coming-soon scene-soon-moc-chau">Mộc Châu <small>sắp có</small></span>
      <span className="scene-coming-soon scene-soon-cao-bang">Cao Bằng <small>sắp có</small></span>
    </div>
    {selected && <div className="scene-destination-card">
      <span>ĐIỂM ĐẾN ĐANG KHÁM PHÁ</span>
      <strong>{selected.city}</strong>
      <small>{selected.meta}</small>
      <button type="button" onClick={() => onSelect(selected.city)}>Lên kế hoạch <ArrowUpRight size={16} /></button>
    </div>}
  </div>
}
