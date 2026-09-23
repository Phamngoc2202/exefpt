import * as THREE from 'three'

function needle(points, color) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
  shape.closePath()
  return new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.36, side: THREE.DoubleSide }),
  )
}

export function mountTravelCompass(container) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20)
  camera.position.set(0, 0, 5.1)

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const compass = new THREE.Group()
  scene.add(compass)

  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(1.27, 1.27, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x214d3d, metalness: 0.25, roughness: 0.58 }),
  )
  face.rotation.x = Math.PI / 2
  compass.add(face)

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.065, 10, 64),
    new THREE.MeshStandardMaterial({ color: 0xe4bc70, metalness: 0.72, roughness: 0.28 }),
  )
  rim.position.z = 0.1
  compass.add(rim)

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.96, 0.012, 6, 64),
    new THREE.MeshStandardMaterial({ color: 0xc7d6ad, metalness: 0.12, roughness: 0.7 }),
  )
  innerRing.position.z = 0.09
  compass.add(innerRing)

  const markMaterial = new THREE.MeshStandardMaterial({ color: 0xe6c881, metalness: 0.48, roughness: 0.4 })
  for (let index = 0; index < 12; index++) {
    const angle = index * Math.PI / 6
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(index % 3 === 0 ? 0.035 : 0.02, index % 3 === 0 ? 0.15 : 0.07, 0.012),
      markMaterial,
    )
    mark.position.set(Math.sin(angle) * 1.09, Math.cos(angle) * 1.09, 0.12)
    mark.rotation.z = -angle
    compass.add(mark)
  }

  const north = needle([[0, 0.9], [-0.18, -0.08], [0, 0.04], [0.18, -0.08]], 0xe9bc6a)
  north.position.z = 0.16
  compass.add(north)

  const south = needle([[0, -0.9], [-0.18, 0.08], [0, -0.04], [0.18, 0.08]], 0xf8f5e9)
  south.position.z = 0.16
  compass.add(south)

  const pin = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xe6c881, metalness: 0.55, roughness: 0.3 }),
  )
  pin.position.z = 0.2
  compass.add(pin)

  scene.add(new THREE.AmbientLight(0xffffff, 2.1))
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(-2, 3, 5)
  scene.add(light)

  const resize = () => {
    const size = container.clientWidth
    if (!size) return
    renderer.setSize(size, size, false)
    camera.aspect = 1
    camera.updateProjectionMatrix()
  }
  resize()

  const observer = new ResizeObserver(resize)
  observer.observe(container)

  let frame = null
  let inView = false
  let startTime = null
  const tick = (time) => {
    frame = null
    if (startTime === null) startTime = time
    const elapsed = time - startTime
    compass.rotation.x = -0.16 + Math.sin(elapsed / 2100) * 0.045
    compass.rotation.y = Math.sin(elapsed / 2800) * 0.12
    compass.rotation.z = Math.sin(elapsed / 3600) * 0.055
    renderer.render(scene, camera)
    if (inView && !document.hidden) frame = window.requestAnimationFrame(tick)
  }
  const refresh = () => {
    if (inView && !document.hidden && frame === null) frame = window.requestAnimationFrame(tick)
    if ((!inView || document.hidden) && frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }
  }
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    refresh()
  })
  intersection.observe(container)
  document.addEventListener('visibilitychange', refresh)
  renderer.render(scene, camera)

  return () => {
    document.removeEventListener('visibilitychange', refresh)
    intersection.disconnect()
    observer.disconnect()
    if (frame !== null) window.cancelAnimationFrame(frame)
    const geometries = new Set()
    const materials = new Set()
    compass.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      if (object.material) materials.add(object.material)
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    renderer.dispose()
    renderer.domElement.remove()
  }
}
