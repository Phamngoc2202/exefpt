import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDays, countTripDays, generatePlan, planFromRow, summarizePlan, toTripPayload, validateTripForm,
} from '../src/lib/tripPlanner.js'

const formFor = (destination = 'Ninh Bình', days = 3, travelers = 2, budget = 5000000) => ({
  destination, startDate: '2026-10-20', endDate: addDays('2026-10-20', days - 1),
  origin: 'Hà Nội', travelers, budget, travelWith: travelers === 1 ? 'Một mình' : 'Cặp đôi',
  style: 'Cân bằng', interests: ['Thiên nhiên', 'Văn hóa'],
})

test('lịch trình có đúng số ngày và ngày thực tế', () => {
  const plan = generatePlan(formFor())
  assert.equal(plan.days.length, 3)
  assert.deepEqual(plan.days.map((day) => day.date), ['2026-10-20', '2026-10-21', '2026-10-22'])
  assert.equal(countTripDays(plan.form.startDate, plan.form.endDate), 3)
  assert.ok(plan.days.every((day) => day.activities.length > 0))
})

test('chi phí được cộng từ từng hoạt động cộng dự phòng, không dùng tỷ lệ cố định', () => {
  const plan = generatePlan(formFor())
  const summary = summarizePlan(plan)
  const activityCosts = plan.days.flatMap((day) => day.activities).reduce((sum, activity) => sum + activity.cost, 0)
  assert.equal(summary.planned, activityCosts)
  assert.equal(summary.reserve, 500000)
  assert.equal(summary.total, activityCosts + 500000)
  plan.days[0].activities[0].cost += 123000
  assert.equal(summarizePlan(plan).total, summary.total + 123000)
})

test('chuyến Hà Nội một ngày không tính phòng hay di chuyển liên tỉnh', () => {
  const plan = generatePlan(formFor('Hà Nội', 1, 1))
  const summary = summarizePlan(plan)
  assert.equal(plan.days.length, 1)
  assert.equal(summary.categories['Lưu trú'], 0)
  assert.equal(plan.days[0].activities.some((activity) => activity.title.includes('Trở về Hà Nội')), false)
})

test('tour vịnh và hang động đi riêng không bị cộng trùng', () => {
  const plan = generatePlan(formFor('Hạ Long', 5, 2, 10000000))
  const titles = plan.days.flatMap((day) => day.activities.map((activity) => activity.title))
  assert.equal(titles.includes('Tour tham quan Vịnh Hạ Long') && titles.includes('Khám phá hang động trên vịnh'), false)
})

test('số người ảnh hưởng tổng chi phí và ngân sách thấp được báo vượt', () => {
  const one = summarizePlan(generatePlan(formFor('Ninh Bình', 2, 1)))
  const four = summarizePlan(generatePlan(formFor('Ninh Bình', 2, 4)))
  assert.ok(four.planned > one.planned)
  assert.equal(summarizePlan(generatePlan(formFor('Ninh Bình', 2, 2, 100000))).overBudget, true)
})

test('kiểm tra điểm đến, số ngày, số người và ngân sách', () => {
  assert.match(validateTripForm(formFor('Đà Nẵng')), /5 điểm đến/)
  assert.match(validateTripForm(formFor('Sa Pa', 1)), /ít nhất 2 ngày/)
  assert.match(validateTripForm(formFor('Hà Giang', 2)), /ít nhất 3 ngày/)
  assert.match(validateTripForm(formFor('Ninh Bình', 6)), /tối đa 5 ngày/)
  assert.match(validateTripForm(formFor('Ninh Bình', 3, 0)), /1 đến 10/)
  assert.match(validateTripForm(formFor('Ninh Bình', 3, 2, 0)), /lớn hơn 0/)
})

test('lưu và đọc lại giữ nguyên các ngày, chi phí, số người', () => {
  const plan = generatePlan(formFor('Hạ Long', 2, 3))
  const payload = toTripPayload(plan, 'user-1')
  const restored = planFromRow({
    id: 'trip-1', ...payload, start_date: payload.start_date, end_date: payload.end_date,
  })
  assert.equal(payload.itinerary.version, 2)
  assert.equal(restored.id, 'trip-1')
  assert.equal(restored.form.travelers, 3)
  assert.deepEqual(restored.days, plan.days)
  assert.deepEqual(summarizePlan(restored), summarizePlan(plan))
})

test('chuyến đi lưu định dạng cũ vẫn đọc được', () => {
  const restored = planFromRow({
    id: 'legacy', destination: 'Ninh Bình', start_date: '2026-10-20', end_date: '2026-10-20',
    budget: 2000000, travel_with: 'Cặp đôi', travel_style: 'Cân bằng', interests: [],
    itinerary: [{ day: 1, activities: [{ time: '09:00', title: 'Tam Cốc', cost: '120.000đ', type: 'place' }] }],
  })
  assert.equal(restored.days[0].activities[0].cost, 120000)
})
