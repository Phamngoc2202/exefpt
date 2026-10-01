import assert from 'node:assert/strict'
import test from 'node:test'
import { findDestination } from '../src/data/northernDestinations.js'
import { placeNameFromActivityTitle, resolveRequestedPlaces, sanitizeRequestedPlaces } from '../src/lib/placeSearch.js'

test('chuẩn hóa, loại trùng và giới hạn địa điểm người dùng yêu cầu', () => {
  assert.deepEqual(sanitizeRequestedPlaces(['Lăng Bác', ' Lăng   Bác ', '', 'A', 'Hồ Gươm', 'Hỏa Lò', 'Nhà thờ Lớn', 'Văn Miếu']), ['Lăng Bác', 'Hồ Gươm', 'Hỏa Lò', 'Nhà thờ Lớn'])
})

test('bỏ động từ khỏi tiêu đề hoạt động trước khi tìm địa điểm', () => {
  assert.equal(placeNameFromActivityTitle('Tham quan Di tích Nhà tù Hỏa Lò'), 'Nhà tù Hỏa Lò')
  assert.equal(placeNameFromActivityTitle('Dạo quanh hồ Hoàn Kiếm'), 'hồ Hoàn Kiếm')
})

test('địa điểm chưa có sẵn được xác minh và chuyển thành hoạt động có tọa độ', async () => {
  const destination = findDestination('Hà Nội')
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [{ lat: '21.0368', lon: '105.8347', display_name: 'Lăng Chủ tịch Hồ Chí Minh, Hà Nội, Việt Nam', osm_type: 'way', osm_id: 123 }],
  })
  const result = await resolveRequestedPlaces(['Lăng Bác'], destination, { fetchImpl, rateLimit: false })

  assert.equal(result.unresolved.length, 0)
  assert.equal(result.activities[0].title, 'Tham quan Lăng Bác')
  assert.deepEqual(result.activities[0].coordinates, { lat: 21.0368, lng: 105.8347 })
  assert.match(result.activities[0].sourceUrl, /openstreetmap\.org\/way\/123/)
})

test('không gọi bản đồ lại cho địa điểm đã có trong danh mục', async () => {
  let calls = 0
  const result = await resolveRequestedPlaces(['Nhà tù Hỏa Lò'], findDestination('Hà Nội'), {
    fetchImpl: async () => { calls += 1; throw new Error('không được gọi') },
    rateLimit: false,
  })
  assert.equal(calls, 0)
  assert.deepEqual(result, { activities: [], unresolved: [] })
})
