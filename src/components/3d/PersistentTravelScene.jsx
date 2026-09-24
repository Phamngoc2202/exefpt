import { useEffect, useRef } from 'react'

const clamp = (value) => Math.min(1, Math.max(0, value))

export default function PersistentTravelScene({ destinations, activeDestination }) {
  const containerRef = useRef(null)
  const controllerRef = useRef(null)
  const activeRef = useRef(activeDestination)
  activeRef.current = activeDestination

  useEffect(() => {
    const container = containerRef.current
    const home = container.closest('.immersive-home')
    const hero = home.querySelector('.home-hero')
    const journey = home.querySelector('.journey-globe')
    const media = window.matchMedia('(max-width: 600px), (prefers-reduced-motion: reduce)')
    const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2
    let alive = true
    let frame = null
    let loading = false
    let loadVersion = 0
    let lastRender = 0

    const update = (time = 0) => {
      frame = null
      const homeRect = home.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      const journeyRect = journey.getBoundingClientRect()
      // Start morphing as soon as the user scrolls the hero and finish as the
      // journey chapter enters. No extra sticky scroll distance is required.
      const journeyDistance = Math.max(1, journeyRect.height - window.innerHeight)
      const animationDistance = Math.max(1, hero.offsetHeight + journeyDistance)
      const progress = clamp(-heroRect.top / animationDistance)
      // Keep the world alive for the complete homepage. Content sections use
      // translucent surfaces so the same 3D journey continues behind them.
      const hasVisibleWorld = homeRect.bottom > 0 && homeRect.top < window.innerHeight
      home.style.setProperty('--travel-world-opacity', hasVisibleWorld ? '1' : '0')
      const controller = controllerRef.current
      if (!controller || document.hidden) return
      if (time - lastRender >= 32 || !lastRender) {
        lastRender = time
        controller.setProgress(progress)
        controller.setActiveDestination(activeRef.current)
        controller.render(time)
      }
      if (hasVisibleWorld) frame = window.requestAnimationFrame(update)
    }
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update)
    }
    const load = () => {
      if (media.matches || lowMemory || loading || controllerRef.current) return
      loading = true
      const version = ++loadVersion
      import('./createPersistentTravelScene').then(({ createPersistentTravelScene }) => {
        if (!alive || version !== loadVersion || media.matches) return
        loading = false
        try {
          controllerRef.current = createPersistentTravelScene(container, destinations)
          container.classList.add('is-ready')
          schedule()
        } catch {
          // The photographic fallback remains visible if WebGL is unavailable.
        }
      }).catch(() => { if (version === loadVersion) loading = false })
    }
    const onMediaChange = () => {
      loadVersion++
      loading = false
      controllerRef.current?.dispose()
      controllerRef.current = null
      container.classList.remove('is-ready')
      load()
      schedule()
    }
    const onPointer = (event) => {
      if (!controllerRef.current || window.innerWidth < 980) return
      controllerRef.current.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2)
      schedule()
    }
    load()
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', schedule)
    media.addEventListener('change', onMediaChange)
    return () => {
      alive = false
      loadVersion++
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', schedule)
      media.removeEventListener('change', onMediaChange)
      controllerRef.current?.dispose()
      home.style.removeProperty('--travel-world-opacity')
    }
  }, [destinations])

  useEffect(() => {
    controllerRef.current?.setActiveDestination(activeDestination)
    controllerRef.current?.render()
  }, [activeDestination])

  return <div className="persistent-travel-scene" ref={containerRef} aria-hidden="true" />
}
