import * as THREE from 'three'
import { createClouds, createLandscape, createMarkers, createRouteAndPlane } from './travelModels'

export function createTravelScene(container, initialDestination) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30)
  camera.position.set(0, 0, 9.5)
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 980 ? 1 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const world = new THREE.Group()
  world.position.y = -2.8
  scene.add(world)
  world.add(createLandscape())
  const clouds = createClouds()
  const cloudOrigins = clouds.map((cloud) => [cloud.position.x, cloud.position.y])
  clouds.forEach((cloud) => world.add(cloud))
  const { route, plane, curve } = createRouteAndPlane()
  world.add(route, plane)
  const markers = createMarkers()
  Object.values(markers).forEach((marker) => world.add(marker))
  scene.add(new THREE.AmbientLight(0xffffff, 2.2))
  const sunlight = new THREE.DirectionalLight(0xfff4dc, 2.1)
  sunlight.position.set(-2, 4, 6)
  scene.add(sunlight)

  let activeDestination = initialDestination
  let pointerX = 0
  let pointerY = 0
  let scrollProgress = 0
  let visible = false
  let frame = null
  let lastFrame = 0
  const onPointer = (event) => {
    if (window.innerWidth < 980) return
    const rect = container.getBoundingClientRect()
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }
  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.position.z = width < 760 ? 11.2 : width < 1100 ? 9.2 : 8.2
    world.scale.setScalar(width < 760 ? 1 : width < 1100 ? 1.08 : 1.2)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  resize()
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(container)
  const onScroll = () => {
    const rect = container.getBoundingClientRect()
    scrollProgress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)))
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  const render = (time) => {
    frame = null
    if (time - lastFrame < 33) { schedule(); return }
    lastFrame = time
    const seconds = time * 0.001
    world.rotation.y += ((pointerX * 0.09) - world.rotation.y) * 0.03
    world.rotation.x += ((-pointerY * 0.06) - world.rotation.x) * 0.03
    world.rotation.z += (scrollProgress * -0.055 - world.rotation.z) * 0.025
    world.position.y += (-2.8 - scrollProgress * 0.35 - world.position.y) * 0.025
    clouds.forEach((cloud, index) => {
      cloud.position.x = cloudOrigins[index][0] + Math.sin(seconds * 0.22 + index) * 0.08
      cloud.position.y = cloudOrigins[index][1] + Math.cos(seconds * 0.52 + index) * 0.035
    })
    const progress = (seconds * 0.055) % 1
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress)
    plane.position.copy(point)
    plane.position.z += 0.18
    plane.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2
    Object.entries(markers).forEach(([city, marker], index) => {
      const selected = city === activeDestination
      const target = selected ? 1.38 : 0.85
      const scale = marker.scale.x + (target - marker.scale.x) * 0.13
      marker.scale.setScalar(scale + Math.sin(seconds * 2 + index) * 0.002)
    })
    renderer.render(scene, camera)
    schedule()
  }
  const schedule = () => {
    if (visible && !document.hidden && frame === null) frame = window.requestAnimationFrame(render)
  }
  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = null
  }
  const refresh = () => { if (visible && !document.hidden) schedule(); else stop() }
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    refresh()
  })
  viewObserver.observe(container)
  document.addEventListener('visibilitychange', refresh)
  container.addEventListener('pointermove', onPointer)
  renderer.render(scene, camera)

  return {
    setActiveDestination(city) { activeDestination = city },
    dispose() {
      stop()
      sizeObserver.disconnect()
      viewObserver.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('scroll', onScroll)
      container.removeEventListener('pointermove', onPointer)
      const geometries = new Set()
      const materials = new Set()
      world.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) materials.add(object.material)
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
