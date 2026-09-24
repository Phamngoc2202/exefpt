import { useEffect, useRef } from 'react'
import { ArrowUpRight, MapPin } from 'lucide-react'

const markerLayout = {
  'Hà Nội': { left: '43%', top: '78%' },
  'Hạ Long': { left: '72%', top: '79%' },
  'Ninh Bình': { left: '51%', top: '88%' },
  'Sa Pa': { left: '25%', top: '69%' },
  'Hà Giang': { left: '64%', top: '69%' },
}

export default function TravelScene({ destinations, activeDestination, onHover, onSelect }) {
  const containerRef = useRef(null)
  const controllerRef = useRef(null)
  const activeRef = useRef(activeDestination)
  activeRef.current = activeDestination
  const selected = destinations.find((destination) => destination.city === activeDestination) || destinations[0]

  useEffect(() => {
    const container = containerRef.current
    const media = window.matchMedia('(max-width: 600px), (prefers-reduced-motion: reduce)')
    const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2
    let alive = true
    let version = 0
    let inView = false
    let revealTimer = null

    const update = () => {
      const current = ++version
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer)
        revealTimer = null
      }
      if (controllerRef.current) {
        controllerRef.current.dispose()
        controllerRef.current = null
      }
      container.classList.remove('is-live', 'is-revealed')
      if (media.matches || lowMemory || !inView) return
      const sceneStartedAt = performance.now()
      import('./createTravelScene').then(({ createTravelScene }) => {
        if (!alive || current !== version) return
        try {
          controllerRef.current = createTravelScene(container, activeRef.current)
          container.classList.add('is-live')
          const remainingPhotoTime = Math.max(150, 1200 - (performance.now() - sceneStartedAt))
          revealTimer = window.setTimeout(() => {
            revealTimer = null
            if (alive && current === version) container.classList.add('is-revealed')
          }, remainingPhotoTime)
        } catch {
          // The destination image remains usable without WebGL.
        }
      }).catch(() => {
        // The 3D scene is optional and must never block trip planning.
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (inView === entry.isIntersecting) return
      inView = entry.isIntersecting
      update()
    }, { rootMargin: '160px' })
    observer.observe(container)
    media.addEventListener('change', update)
    return () => {
      alive = false
      version++
      if (revealTimer !== null) window.clearTimeout(revealTimer)
      observer.disconnect()
      media.removeEventListener('change', update)
      controllerRef.current?.dispose()
      controllerRef.current = null
      container.classList.remove('is-live', 'is-revealed')
    }
  }, [])

  useEffect(() => {
    controllerRef.current?.setActiveDestination(activeDestination)
  }, [activeDestination])

  return <div className="travel-scene" ref={containerRef}>
    <div className="travel-scene-fallback" role="img" aria-label="Phong cảnh miền Bắc Việt Nam" />
    <div className="travel-scene-sheen" aria-hidden="true" />
    <div className="scene-markers" aria-label="Chọn điểm đến trên bản đồ miền Bắc">
      {destinations.map((destination) => <button
        type="button"
        key={destination.city}
        className={destination.city === activeDestination ? 'scene-marker active' : 'scene-marker'}
        style={markerLayout[destination.city]}
        onMouseEnter={() => onHover(destination.city)}
        onFocus={() => onHover(destination.city)}
        onClick={() => onSelect(destination.city)}
        aria-label={'Lên kế hoạch đi ' + destination.city}
      ><span className="marker-core"><MapPin size={13} /></span><span className="marker-name">{destination.city}</span></button>)}
      <span className="scene-coming-soon scene-soon-moc-chau">Mộc Châu <small>sắp có</small></span>
      <span className="scene-coming-soon scene-soon-cao-bang">Cao Bằng <small>sắp có</small></span>
    </div>
    {selected && <div className="scene-destination-card">
      <span>ĐIỂM ĐẾN ĐANG KHÁM PHÁ</span>
      <strong>{selected.city}</strong>
      <small>{selected.meta}</small>
      <button type="button" onClick={() => onSelect(selected.city)}>Lên kế hoạch <ArrowUpRight size={16} /></button>
    </div>}
    <span className="scene-axis" aria-hidden="true">N <span>↑</span> S</span>
  </div>
}
