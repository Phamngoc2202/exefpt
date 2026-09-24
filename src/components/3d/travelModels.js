import * as THREE from 'three'

export const markerPositions = {
  'Hà Nội': [-0.35, -0.4],
  'Hạ Long': [1.65, -0.65],
  'Ninh Bình': [-0.55, -1.43],
  'Sa Pa': [-1.7, 0.95],
  'Hà Giang': [0.65, 1.2],
}
const material = (color, metalness = 0.05, roughness = 0.68) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, flatShading: true })

export function createLandscape() {
  const group = new THREE.Group()

  // Main island body - deep rich emerald teal
  const island = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), material(0x1a7a72, 0.08, 0.65))
  island.scale.set(3.25, 2.35, 0.42)
  island.position.set(0, -0.28, -0.15)
  group.add(island)

  // Coastal shelf - clear tropical blue-cyan
  const coast = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), material(0x0e5a70, 0.12, 0.55))
  coast.scale.set(3.32, 2.4, 0.28)
  coast.position.set(0, -0.4, -0.4)
  group.add(coast)

  // Mountain peaks with vibrant natural gradients
  const hillColors = [0x3eb4a2, 0x2a9d8f, 0x52c7b8, 0x217e76, 0x48cae4]
  const hills = [
    [-2.1, 0.5, 0.78, 1.18], [-1.55, 1.03, 0.7, 1.4], [-0.94, 0.48, 0.68, 1.05],
    [0.35, 1.18, 0.85, 1.4], [0.9, 0.7, 0.72, 1.17], [1.5, -0.1, 0.6, 0.95],
    [-1.25, -0.75, 0.6, 0.8], [0.1, -0.58, 0.75, 0.95], [1.9, -0.78, 0.49, 0.72],
  ]
  hills.forEach(([x, y, radius, height], index) => {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 5), material(hillColors[index % hillColors.length], 0.05, 0.62))
    hill.position.set(x, y + height * 0.16, 0.26 + index * 0.008)
    hill.rotation.z = (index % 2 ? 1 : -1) * 0.15
    group.add(hill)

    // Snow caps on tall mountains
    if (index === 1 || index === 3) {
      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.28, height * 0.3, 5),
        new THREE.MeshStandardMaterial({ color: 0xf4fbfa, roughness: 0.3, flatShading: true })
      )
      snow.position.set(x, y + height * 0.56, 0.3 + index * 0.008)
      snow.rotation.z = hill.rotation.z
      group.add(snow)
    }
  })

  // Golden glowing sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  )
  sun.position.set(2.6, 1.85, -1.2)
  group.add(sun)

  return group
}

export function createClouds() {
  return [[-2.3, 1.74, 0.65], [1.64, 1.52, 0.55], [-0.3, -1.95, 0.48]].map(([x, y, size]) => {
    const cloud = new THREE.Group()
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      roughness: 0.9,
    })
    ;[[-0.38, 0, 0.32], [0, 0.12, 0.43], [0.42, -0.02, 0.29]].forEach(([offset, rise, radius]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), cloudMaterial)
      puff.position.set(offset, rise, 0)
      cloud.add(puff)
    })
    cloud.scale.setScalar(size)
    cloud.position.set(x, y, 1.15)
    return cloud
  })
}

export function createRouteAndPlane() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.7, 0.95, 1.1),
    new THREE.Vector3(-0.74, 0.43, 1.16),
    new THREE.Vector3(-0.35, -0.4, 1.18),
    new THREE.Vector3(0.64, 0.15, 1.2),
    new THREE.Vector3(1.65, -0.65, 1.14),
  ])
  const route = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.022, 6, false),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 }),
  )

  const planeShape = new THREE.Shape()
  planeShape.moveTo(0, 0.32)
  planeShape.lineTo(-0.13, -0.24)
  planeShape.lineTo(0, -0.14)
  planeShape.lineTo(0.13, -0.24)
  planeShape.closePath()
  const plane = new THREE.Mesh(
    new THREE.ShapeGeometry(planeShape),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.2, side: THREE.DoubleSide }),
  )
  plane.position.z = 1.35
  return { route, plane, curve }
}

export function createMarkers() {
  return Object.fromEntries(Object.entries(markerPositions).map(([city, [x, y]]) => {
    const group = new THREE.Group()
    group.position.set(x, y, 1.1)
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0x64dfdf, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    )
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    )
    group.add(halo, dot)
    return [city, group]
  }))
}
