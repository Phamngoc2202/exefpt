import * as THREE from 'three'

// Nodes are logical day positions, not invented map coordinates.
export function createTripRouteScene(container, count) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 25)
  camera.position.set(0, 0, 7.2)
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  scene.add(new THREE.AmbientLight(0xffffff, 2))
  const light = new THREE.DirectionalLight(0xe5ffff, 2)
  light.position.set(-2, 4, 6)
  scene.add(light)

  const points = Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1)
    return new THREE.Vector3((t - 0.5) * 6.2, Math.sin(t * Math.PI * 1.7) * 0.65, 0.2)
  })
  const nodes = points.map((point) => {
    const marker = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.13, 1),
      new THREE.MeshStandardMaterial({ color: 0xb4e5dd, emissive: 0x133c45, roughness: 0.45 }),
    )
    marker.position.copy(point)
    scene.add(marker)
    return marker
  })
  let route = null
  if (count > 1) {
    const curve = new THREE.CatmullRomCurve3(points)
    route = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(40, count * 12), 0.014, 5, false),
      new THREE.MeshBasicMaterial({ color: 0xffdaa5, transparent: true, opacity: 0.7 }),
    )
    scene.add(route)
  }
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.29, 28),
    new THREE.MeshBasicMaterial({ color: 0xffe8c5, side: THREE.DoubleSide, transparent: true, opacity: 0.86 }),
  )
  scene.add(halo)
  let active = 0

  function paint() {
    nodes.forEach((node, nodeIndex) => {
      node.scale.setScalar(nodeIndex === active ? 1.55 : 0.82)
      node.material.color.setHex(nodeIndex === active ? 0xffdbaa : 0xb4e5dd)
    })
    halo.position.copy(points[active])
    halo.position.z += 0.08
    camera.position.x = points[active].x * 0.09
    camera.lookAt(camera.position.x * 0.2, 0, 0)
    renderer.render(scene, camera)
  }

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.position.z = width < 600 ? 9.4 : 7.2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    paint()
  }
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(container)
  resize()

  return {
    setActive(index) {
      active = Math.max(0, Math.min(index, count - 1))
      paint()
    },
    dispose() {
      sizeObserver.disconnect()
      nodes.forEach((node) => { node.geometry.dispose(); node.material.dispose() })
      route?.geometry.dispose()
      route?.material.dispose()
      halo.geometry.dispose()
      halo.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
