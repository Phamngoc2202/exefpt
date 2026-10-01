import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFallbackRoute, parseOsrmTrip } from '../api/day-route.js'

const places = [
  { title: 'Nhà tù Hỏa Lò', coordinates: { lat: 21.0253, lng: 105.8464 } },
  { title: 'Nhà thờ Lớn Hà Nội', coordinates: { lat: 21.0287, lng: 105.8488 } },
]

test('chuẩn hóa tuyến OSRM thành tổng quãng đường, thời gian và từng chặng', () => {
  const route = parseOsrmTrip({
    code: 'Ok',
    waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }],
    trips: [{ distance: 1350, duration: 420, geometry: { type: 'LineString', coordinates: [[105.8464, 21.0253], [105.8488, 21.0287]] }, legs: [{ distance: 1350, duration: 420 }] }],
  }, places)
  assert.equal(route.distanceKm, 1.4)
  assert.equal(route.durationMinutes, 7)
  assert.equal(route.legs[0].from, 'Nhà tù Hỏa Lò')
  assert.equal(route.legs[0].to, 'Nhà thờ Lớn Hà Nội')
  assert.equal(route.estimated, false)
})

test('tạo tuyến dự phòng có ghi rõ là ước tính', () => {
  const route = buildFallbackRoute(places)
  assert.ok(route.distanceKm > 0)
  assert.ok(route.durationMinutes > 0)
  assert.equal(route.legs.length, 1)
  assert.equal(route.estimated, true)
})
