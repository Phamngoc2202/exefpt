import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOverpassAccommodations } from '../api/accommodations.js'
import { buildLodgingProviderLinks } from '../src/lib/lodgingProviders.js'

test('chuẩn hóa và loại trùng nơi lưu trú từ OpenStreetMap', () => {
  const places = parseOverpassAccommodations({ elements: [
    { type: 'node', id: 1, lat: 20.2, lon: 105.9, tags: { name: 'Tam Cốc Hotel', tourism: 'hotel', 'addr:street': 'Đường Tam Cốc' } },
    { type: 'way', id: 2, center: { lat: 20.21, lon: 105.91 }, tags: { name: 'Tam Cốc Hotel', tourism: 'hotel' } },
    { type: 'node', id: 3, lat: 20.22, lon: 105.92, tags: { name: 'Nhà nghỉ Xanh', tourism: 'guest_house', website: 'javascript:alert(1)' } },
  ] })

  assert.equal(places.length, 2)
  assert.equal(places[0].type, 'Khách sạn')
  assert.equal(places[1].type, 'Nhà nghỉ / homestay')
  assert.equal(places[1].website, null)
})

test('liên kết tìm phòng mang theo ngày, số khách và số phòng', () => {
  const result = buildLodgingProviderLinks({
    destination: 'Ninh Bình', startDate: '2026-10-20', endDate: '2026-10-22', travelers: 3,
  })
  const booking = result.providers.find((provider) => provider.name === 'Booking.com')

  assert.equal(result.rooms, 2)
  assert.match(booking.url, /checkin=2026-10-20/)
  assert.match(booking.url, /checkout=2026-10-22/)
  assert.match(booking.url, /group_adults=3/)
  assert.match(booking.url, /no_rooms=2/)
})
