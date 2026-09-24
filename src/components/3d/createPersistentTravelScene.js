import * as THREE from 'three'
import { createClouds, createLandscape, createMarkers, createRouteAndPlane } from './travelModels'

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
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const world = new THREE.Group()
  world.position.y = -2.8
  world.add(createLandscape())
  scene.add(world)

  const clouds = createClouds()
  const cloudOrigins = clouds.map((cloud) => cloud.position.clone())
  clouds.forEach((cloud) => world.add(cloud))
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

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.position.z = width < 760 ? 11.2 : width < 1100 ? 9.2 : 8.2
    baseScale = width < 760 ? 1 : width < 1100 ? 1.08 : 1.2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(container)

  function render(time = 0) {
    const morph = smooth(progress)
    const seconds = time * 0.001

    // Scale & Position morph on scroll
    const targetScale = baseScale * (1 + morph * 0.65)
    world.scale.setScalar(targetScale)
    world.position.y += (-2.8 + morph * 1.5 - world.position.y) * 0.08

    // 3D Perspective Rotation Morph: As user scrolls, island tilts to reveal top-down 3D map depth
    const targetRotY = pointerX * 0.12 + morph * 0.35 + Math.sin(seconds * 0.3) * 0.04
    const targetRotX = -pointerY * 0.08 + morph * 0.32 + 0.12
    const targetRotZ = -morph * 0.18

    world.rotation.y += (targetRotY - world.rotation.y) * 0.08
    world.rotation.x += (targetRotX - world.rotation.x) * 0.08
    world.rotation.z += (targetRotZ - world.rotation.z) * 0.08

    clouds.forEach((cloud, index) => {
      const origin = cloudOrigins[index]
      cloud.position.x = origin.x + Math.sin(seconds * 0.25 + index) * 0.1
      cloud.position.y = origin.y + Math.cos(seconds * 0.45 + index) * 0.045
    })
    const point = curve.getPointAt((seconds * 0.055) % 1)
    const tangent = curve.getTangentAt((seconds * 0.055) % 1)
    plane.position.copy(point)
    plane.position.z += 0.18
    plane.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2
    Object.entries(markers).forEach(([city, marker], index) => {
      const target = city === activeDestination ? 1.42 : 0.85
      const scale = marker.scale.x + (target - marker.scale.x) * 0.13
      marker.scale.setScalar(scale + Math.sin(seconds * 2.4 + index) * 0.04)
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
      world.traverse((object) => {
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
