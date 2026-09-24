import { useEffect, useRef } from 'react'
import { formatTripDate } from '../../lib/tripPlanner'

export default function TripRouteScene({ days, activeDay, destination }) {
  const containerRef = useRef(null)
  const controllerRef = useRef(null)
  const activeIndex = Math.max(0, days.findIndex((day) => day.day === activeDay))
  const dayCount = days.length
  const activeRef = useRef(activeIndex)
  activeRef.current = activeIndex

  useEffect(() => {
    if (dayCount === 0) return undefined
    const container = containerRef.current
    const media = window.matchMedia('(max-width: 600px), (prefers-reduced-motion: reduce)')
    let alive = true
    let version = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || media.matches) return
      const current = ++version
      import('./createTripRouteScene').then(({ createTripRouteScene }) => {
        if (!alive || current !== version || media.matches || controllerRef.current) return
        try {
          controllerRef.current = createTripRouteScene(container, dayCount)
          controllerRef.current.setActive(activeRef.current)
          container.classList.add('is-ready')
        } catch {
          // The day labels remain usable without WebGL.
        }
      }).catch(() => {})
    }, { rootMargin: '140px' })
    observer.observe(container)
    const onMediaChange = () => {
      version++
      controllerRef.current?.dispose()
      controllerRef.current = null
      container.classList.remove('is-ready')
      if (!media.matches) observer.unobserve(container)
      if (!media.matches) observer.observe(container)
    }
    media.addEventListener('change', onMediaChange)
    return () => {
      alive = false
      version++
      observer.disconnect()
      media.removeEventListener('change', onMediaChange)
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [dayCount])

  useEffect(() => {
    controllerRef.current?.setActive(activeIndex)
  }, [activeIndex])

  const current = days[activeIndex]
  return <div className="trip-route-visual">
    <div className="trip-route-copy"><span>HÀNH TRÌNH CỦA BẠN / {String(days.length).padStart(2, '0')} NGÀY</span><strong>{destination}</strong><small>{current ? `Ngày ${current.day} · ${formatTripDate(current.date)} · ${current.activities.length} hoạt động` : ''}</small></div>
    <div className="trip-route-canvas" ref={containerRef} aria-hidden="true" />
    <ol className="trip-route-day-list" aria-label="Các ngày trong lịch trình">
      {days.map((day) => <li key={day.day} className={day.day === activeDay ? 'active' : ''}><span>{String(day.day).padStart(2, '0')}</span></li>)}
    </ol>
    <span className="trip-route-caption">Đường nối biểu thị thứ tự ngày, không phải tuyến đường địa lý.</span>
  </div>
}
