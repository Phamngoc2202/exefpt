import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAiGenerationMessage, normalizeRequestedPlacePreferences, planFromGeminiPreferences } from '../api/generate-itinerary.js'
import { refineDayFromGemini } from '../api/refine-itinerary.js'
import { addDays, summarizePlan } from '../src/lib/tripPlanner.js'

const form = {
  destination: 'Ninh Bình',
  startDate: '2026-10-20',
  endDate: addDays('2026-10-20', 2),
  origin: 'Hà Nội',
  travelers: 2,
  budget: 6000000,
  travelWith: 'Cặp đôi',
  style: 'Cân bằng',
  interests: ['Thiên nhiên', 'Chụp ảnh'],
}

test('thông báo AI liệt kê tự nhiên các địa điểm đã đưa vào lịch trình', () => {
  assert.equal(
    buildAiGenerationMessage(['Lăng Bác', 'Nhà tù Hỏa Lò', 'Nhà thờ Lớn']),
    'TripGenie AI đã tạo lịch trình gồm Lăng Bác, Nhà tù Hỏa Lò và Nhà thờ Lớn theo yêu cầu của bạn.',
  )
  assert.equal(buildAiGenerationMessage([]), '')
})

test('chuẩn hóa địa điểm và ngày cụ thể do AI đọc từ yêu cầu', () => {
  assert.deepEqual(normalizeRequestedPlacePreferences([{ name: ' Lăng   Bác ', day: 2 }, { name: 'Hỏa Lò', day: 99 }], 3), [
    { name: 'Lăng Bác', day: 2 },
    { name: 'Hỏa Lò', day: 0 },
  ])
})

test('ưu tiên hoạt động Gemini chọn nhưng vẫn giữ chi phí do TripGenie tính', () => {
  const plan = planFromGeminiPreferences(form, { days: [
    { day: 1, label: 'Non nước mở đầu', activityTitles: ['Đi thuyền Tràng An'], activityTimes: [{ id: '2026-10-20-local', time: '08:30' }] },
    { day: 2, label: 'Một ngày thanh tịnh', activityTitles: ['Tham quan chùa Bái Đính'], activityTimes: [] },
  ] })

  assert.equal(plan.days[0].label, 'Non nước mở đầu')
  assert.ok(plan.days[0].activities.some((activity) => activity.title === 'Đi thuyền Tràng An' && activity.cost === 600000))
  assert.equal(plan.days[0].activities.find((activity) => activity.id === '2026-10-20-local').time, '08:30')
  assert.equal(plan.days[1].label, 'Một ngày thanh tịnh')
  assert.ok(summarizePlan(plan).planned > 0)
})

test('bỏ qua hoạt động Gemini tự bịa và ngày nằm ngoài chuyến đi', () => {
  const plan = planFromGeminiPreferences(form, { days: [
    { day: 1, label: 'Ngày hợp lệ', activityTitles: ['Bay trực thăng riêng'] },
    { day: 99, label: 'Ngày không tồn tại', activityTitles: ['Đi thuyền Tràng An'] },
  ] })

  const titles = plan.days.flatMap((day) => day.activities.map((activity) => activity.title))
  assert.equal(titles.includes('Bay trực thăng riêng'), false)
  assert.equal(plan.days.length, 3)
  assert.equal(plan.days[0].label, 'Ngày hợp lệ')
})

test('địa điểm tự do đã xác minh được ưu tiên và giữ tọa độ bản đồ', () => {
  const customForm = { ...form, destination: 'Hà Nội', endDate: '2026-10-20', specialRequest: 'Tôi muốn đến Lăng Bác' }
  const customActivity = {
    title: 'Tham quan Lăng Bác', aliases: ['Lăng Bác'], costPerPerson: 0,
    tags: ['Văn hóa'], suggestedDay: 1, note: 'Đã xác minh.', type: 'place', external: true,
    coordinates: { lat: 21.0368, lng: 105.8347 }, source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/way/123',
  }
  const plan = planFromGeminiPreferences(customForm, { days: [] }, [customActivity])
  const activity = plan.days[0].activities.find((item) => item.title === 'Tham quan Lăng Bác')

  assert.ok(activity)
  assert.deepEqual(activity.coordinates, customActivity.coordinates)
  assert.equal(activity.source, 'OpenStreetMap')
})

test('địa điểm được yêu cầu vào ngày 2 không xuất hiện ở ngày 1', () => {
  const customForm = { ...form, destination: 'Hà Nội', endDate: addDays(form.startDate, 1), specialRequest: 'Cần có địa điểm Lăng Bác ngày 2' }
  const customActivity = {
    title: 'Tham quan Lăng Bác', aliases: ['Lăng Bác'], costPerPerson: 0,
    tags: ['Văn hóa'], suggestedDay: 1, note: 'Đã xác minh.', type: 'place', external: true,
    coordinates: { lat: 21.0368, lng: 105.8347 }, source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/way/123',
  }
  const plan = planFromGeminiPreferences(customForm, { requestedPlaces: [{ name: 'Lăng Bác', day: 2 }], days: [] }, [customActivity])
  const dayOneTitles = plan.days[0].activities.map((activity) => activity.title)
  const dayTwoActivity = plan.days[1].activities.find((activity) => activity.title === 'Tham quan Lăng Bác')

  assert.equal(dayOneTitles.includes('Tham quan Lăng Bác'), false)
  assert.ok(dayTwoActivity)
  assert.equal(dayTwoActivity.requestedDay, 2)
})

test('AI chỉnh một ngày nhưng chi phí vẫn lấy từ dữ liệu TripGenie', () => {
  const original = planFromGeminiPreferences(form, { days: [] })
  const result = refineDayFromGemini(form, original.days[0], {
    label: 'Khám phá non nước nhẹ nhàng',
    explanation: 'Ưu tiên cảnh đẹp và thời gian nghỉ ngơi.',
    activities: [
      { title: 'Đi thuyền Tràng An', time: '09:30', note: 'Khởi hành sau bữa sáng.' },
      { title: 'Bay trực thăng riêng', time: '15:00', note: 'Hoạt động không tồn tại.' },
    ],
  })

  assert.equal(result.day.label, 'Khám phá non nước nhẹ nhàng')
  assert.ok(result.day.activities.some((activity) => activity.title === 'Đi thuyền Tràng An' && activity.cost === 600000))
  assert.equal(result.day.activities.some((activity) => activity.title === 'Bay trực thăng riêng'), false)
  assert.match(result.explanation, /cảnh đẹp/)
})

test('AI có thể đổi giờ trở về nhưng không thay đổi chi phí di chuyển', () => {
  const original = planFromGeminiPreferences(form, { days: [] })
  const lastDay = original.days[2]
  const originalReturn = lastDay.activities.find((activity) => activity.title === 'Trở về Hà Nội')
  const result = refineDayFromGemini(form, lastDay, {
    label: 'Khám phá và về sớm',
    explanation: 'Đã đổi giờ trở về theo yêu cầu.',
    activities: [{ title: 'Đi thuyền ở Vân Long', time: '13:30', note: 'Kết thúc sớm để kịp trở về.' }],
    fixedActivityTimes: [{ id: originalReturn.id, time: '17:00' }],
  })
  const updatedReturn = result.day.activities.find((activity) => activity.id === originalReturn.id)

  assert.equal(updatedReturn.time, '17:00')
  assert.equal(updatedReturn.cost, originalReturn.cost)
})

test('AI chỉnh ngày vẫn giữ được địa điểm tự do đã xác minh', () => {
  const customActivity = {
    title: 'Tham quan Lăng Bác', costPerPerson: 0, tags: ['Văn hóa'], suggestedDay: 1,
    note: 'Đã xác minh.', type: 'place', external: true, location: 'Ba Đình, Hà Nội',
    coordinates: { lat: 21.0368, lng: 105.8347 }, source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/way/123',
  }
  const currentDay = planFromGeminiPreferences({ ...form, destination: 'Hà Nội', endDate: '2026-10-20', specialRequest: 'Lăng Bác' }, { days: [] }, [customActivity]).days[0]
  const result = refineDayFromGemini({ ...form, destination: 'Hà Nội' }, currentDay, {
    label: 'Ngày Ba Đình', explanation: 'Giữ địa điểm người dùng yêu cầu.',
    activities: [{ title: 'Tham quan Lăng Bác', time: '09:30', note: 'Tham quan buổi sáng.' }],
  }, [], [customActivity])
  const activity = result.day.activities.find((item) => item.title === 'Tham quan Lăng Bác')

  assert.ok(activity)
  assert.deepEqual(activity.coordinates, customActivity.coordinates)
  assert.equal(activity.external, true)
})
