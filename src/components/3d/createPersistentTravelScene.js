import * as THREE from 'three'
import { createLandscape, createMarkers, createRouteAndPlane, createSkyDecorations } from './travelModels'

const clamp = (value) => Math.min(1, Math.max(0, value))
const smooth = (value) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

// Reuse TripGenie's original low-poly northern landscape. It remains the same
// recognizable globe/island as the user scrolls; only its pose and scale change.
export function createPersistentTravelScene(container, destinations) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30)
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  const viewportPixels = window.innerWidth * window.innerHeight
  const pixelRatioLimit = viewportPixels >= 2000000 ? 1 : 1.2
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const sky = createSkyDecorations()
  scene.add(sky.group)

  const world = new THREE.Group()
  let heroWorldY = -1.85
  world.position.y = heroWorldY
  world.add(createLandscape())
  scene.add(world)

  const { route, plane, curve } = createRouteAndPlane()
  world.add(route, plane)
  const markers = createMarkers()
  Object.values(markers).forEach((marker) => world.add(marker))

  // Balanced ambient light so shadows remain crisp & dramatic
  scene.add(new THREE.AmbientLight(0xffffff, 0.95))

  // Primary warm sunlight casting clear shadows on low-poly facets
  const sunlight = new THREE.DirectionalLight(0xfff5e6, 2.4)
  sunlight.position.set(-3, 5, 5)
  scene.add(sunlight)

  // Secondary cyan/blue rim light for depth highlight
  const rimLight = new THREE.DirectionalLight(0x64dfdf, 1.2)
  rimLight.position.set(4, -2, 3)
  scene.add(rimLight)

  let progress = 0
  let activeDestination = destinations[0]?.city
  let pointerX = 0
  let pointerY = 0
  let baseScale = 1.2
  let lastRenderTime = 0

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.position.z = width < 760 ? 11.2 : width < 1100 ? 9.2 : 8.2
    baseScale = width < 760 ? 1 : width < 1100 ? 1.08 : 1.2
    heroWorldY = width < 1100 ? -1.55 : -1.85
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render(performance.now())
  }
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(container)

  function render(time = performance.now()) {
    const morph = smooth(progress)
    const seconds = time * 0.001
    const firstFrame = lastRenderTime === 0
    const elapsed = firstFrame ? 1 / 60 : Math.min(0.05, Math.max(0, (time - lastRenderTime) / 1000))
    lastRenderTime = time
    const transformEase = 1 - Math.exp(-8 * elapsed)
    const markerEase = 1 - Math.exp(-12 * elapsed)

    // Scale & Position morph on scroll
    const targetScale = baseScale * (0.92 + morph * 0.73)
    const nextScale = world.scale.x + (targetScale - world.scale.x) * transformEase
    world.scale.setScalar(nextScale)
    world.position.y += (heroWorldY + morph * (-1.3 - heroWorldY) - world.position.y) * transformEase

    // The sky frames the island in the hero, then clears as the map rises.
    const skyOpacity = 1 - morph
    sky.group.visible = skyOpacity > 0.01
    sky.materials.forEach(([material, opacity]) => { material.opacity = opacity * skyOpacity })
    sky.clouds.forEach(({ cloud, x, y }, index) => {
      cloud.position.x = x + Math.sin(seconds * 0.16 + index) * 0.045
      cloud.position.y = y + Math.sin(seconds * 0.22 + index * 1.7) * 0.035
    })

    // 3D Perspective Rotation Morph: As user scrolls, island tilts to reveal top-down 3D map depth
    const targetRotY = pointerX * 0.12 + morph * 0.35 + Math.sin(seconds * 0.3) * 0.04
    const targetRotX = -pointerY * 0.08 + morph * 0.32 + 0.12
    const targetRotZ = -morph * 0.18

    world.rotation.y += (targetRotY - world.rotation.y) * transformEase
    world.rotation.x += (targetRotX - world.rotation.x) * transformEase
    world.rotation.z += (targetRotZ - world.rotation.z) * transformEase

    // Fly both ways along the route. Ease at each end so the plane turns
    // around instead of jumping back to its starting point.
    const routePhase = (seconds * 0.07) % 2
    const returning = routePhase > 1
    const routeProgress = smooth(returning ? 2 - routePhase : routePhase)
    const point = curve.getPointAt(routeProgress)
    const tangent = curve.getTangentAt(routeProgress)
    plane.position.copy(point)
    plane.position.z += 0.18
    const direction = returning ? -1 : 1
    const targetPlaneRotation = Math.atan2(tangent.y * direction, tangent.x * direction) - Math.PI / 2
    const rotationDelta = Math.atan2(
      Math.sin(targetPlaneRotation - plane.rotation.z),
      Math.cos(targetPlaneRotation - plane.rotation.z),
    )
    plane.rotation.z += firstFrame ? rotationDelta : rotationDelta * markerEase
    Object.entries(markers).forEach(([city, marker], index) => {
      const target = city === activeDestination ? 1.42 : 0.85
      const current = marker.userData.smoothScale ?? marker.scale.x
      const scale = current + (target - current) * markerEase
      marker.userData.smoothScale = scale
      marker.scale.setScalar(scale + Math.sin(seconds * 2.4 + index) * 0.035)
    })
    renderer.render(scene, camera)
  }
  resize()

  return {
    setProgress(value) { progress = clamp(value) },
    setActiveDestination(city) { activeDestination = city },
    setPointer(x, y) { pointerX = x; pointerY = y },
    render,
    dispose() {
      sizeObserver.disconnect()
      const geometries = new Set()
      const materials = new Set()
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry)
        if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material))
        else if (object.material) materials.add(object.material)
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
