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
    const media = window.matchMedia('(max-width: 600px), (prefers-reduced-motion: reduce)')
    const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2
    let alive = true
    let frame = null
    let loading = false
    let loadVersion = 0
    let lastRender = 0
    let lastWorldVisibility = null
    let idleHandle = null
    let idleUsesTimeout = false
    let metrics = { heroTop: 0, homeTop: 0, homeBottom: 0, animationDistance: 1 }

    const measure = () => {
      const scrollY = window.scrollY
      const homeRect = home.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      metrics = {
        heroTop: heroRect.top + scrollY,
        homeTop: homeRect.top + scrollY,
        homeBottom: homeRect.bottom + scrollY,
        animationDistance: Math.max(1, hero.offsetHeight),
      }
    }

    const update = (time = 0) => {
      frame = null
      // Morph while the hero scrolls away, finishing as Explore enters.
      const scrollY = window.scrollY
      const progress = clamp((scrollY - metrics.heroTop) / metrics.animationDistance)
      // Keep the world alive for the complete homepage. Content sections use
      // translucent surfaces so the same 3D journey continues behind them.
      const hasVisibleWorld = scrollY + window.innerHeight > metrics.homeTop && scrollY < metrics.homeBottom
      if (hasVisibleWorld !== lastWorldVisibility) {
        home.style.setProperty('--travel-world-opacity', hasVisibleWorld ? '1' : '0')
        lastWorldVisibility = hasVisibleWorld
      }
      const controller = controllerRef.current
      if (!controller || document.hidden) return
      // Follow the display refresh rate while the scene is prominent. Farther
      // down the page it is only a subtle backdrop, so a lower cadence suffices.
      const sceneIsProminent = scrollY < metrics.heroTop + metrics.animationDistance * 1.5
      if (sceneIsProminent || time - lastRender >= 32 || !lastRender) {
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
    const onResize = () => {
      measure()
      schedule()
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
    const cancelScheduledLoad = () => {
      if (idleHandle === null) return
      if (idleUsesTimeout) window.clearTimeout(idleHandle)
      else window.cancelIdleCallback(idleHandle)
      idleHandle = null
    }
    const scheduleLoad = () => {
      cancelScheduledLoad()
      if (media.matches || lowMemory || controllerRef.current) return
      if ('requestIdleCallback' in window) {
        idleUsesTimeout = false
        idleHandle = window.requestIdleCallback(() => { idleHandle = null; load() }, { timeout: 1400 })
      } else {
        idleUsesTimeout = true
        idleHandle = window.setTimeout(() => { idleHandle = null; load() }, 450)
      }
    }
    const onMediaChange = () => {
      loadVersion++
      loading = false
      controllerRef.current?.dispose()
      controllerRef.current = null
      container.classList.remove('is-ready')
      scheduleLoad()
      schedule()
    }
    const onPointer = (event) => {
      if (!controllerRef.current || window.innerWidth < 980) return
      controllerRef.current.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2)
      schedule()
    }
    const layoutObserver = new ResizeObserver(onResize)
    layoutObserver.observe(home)
    layoutObserver.observe(hero)
    measure()
    scheduleLoad()
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', schedule)
    media.addEventListener('change', onMediaChange)
    return () => {
      alive = false
      loadVersion++
      cancelScheduledLoad()
      layoutObserver.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
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
