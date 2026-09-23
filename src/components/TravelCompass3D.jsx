import { useEffect, useRef } from 'react'
import { Compass } from 'lucide-react'

export default function TravelCompass3D() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const media = window.matchMedia('(max-width: 760px), (prefers-reduced-motion: reduce)')
    let mounted = true
    let version = 0
    let dispose = null

    const update = () => {
      const currentVersion = ++version
      dispose?.()
      dispose = null
      container.classList.remove('is-live')

      if (media.matches) return

      import('../lib/mountTravelCompass').then(({ mountTravelCompass }) => {
        if (!mounted || currentVersion !== version) return
        try {
          dispose = mountTravelCompass(container)
          container.classList.add('is-live')
        } catch {
          // Browsers without WebGL keep the lightweight static compass.
        }
      }).catch(() => {
        // A failed optional 3D download must not affect the travel planner.
      })
    }

    media.addEventListener('change', update)
    update()

    return () => {
      mounted = false
      version++
      media.removeEventListener('change', update)
      dispose?.()
    }
  }, [])

  return <div className="travel-compass" ref={containerRef} aria-hidden="true">
    <span className="travel-compass-north">N</span>
    <span className="travel-compass-fallback"><Compass size={58} strokeWidth={1.25} /></span>
    <span className="travel-compass-caption">ĐI THEO CÁCH BẠN MUỐN</span>
  </div>
}
