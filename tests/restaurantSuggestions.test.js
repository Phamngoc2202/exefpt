import assert from 'node:assert/strict'
import test from 'node:test'
import { generatePlan, planFromRow, summarizePlan, toTripPayload } from '../src/lib/tripPlanner.js'
import { applyGroundedRestaurants, applyUnverifiedRestaurants, hasMissingRestaurants, suggestRestaurants } from '../src/lib/restaurantSuggestions.js'

const form = {
  destination: 'Ninh Bình', origin: 'Hà Nội', startDate: '2026-10-20', endDate: '2026-10-21',
  travelers: 2, budget: 5000000, travelWith: 'Cặp đôi', style: 'Cân bằng', interests: ['Văn hóa'],
}

test('gắn quán từ nguồn Google Maps nhưng giữ nguyên chi phí dự toán', () => {
  const plan = generatePlan(form)
  const before = summarizePlan(plan)
  const enriched = applyGroundedRestaurants(plan, {
    content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư\nNGAY 1 TOI: Quán ăn Tam Cốc' }] },
    groundingMetadata: { groundingChunks: [
      { maps: { title: 'Nhà hàng Hoa Lư', uri: 'https://maps.google.com/?cid=123', placeId: 'places/ChIJexample123' } },
      { maps: { title: 'Quán ăn Tam Cốc', uri: 'https://maps.google.com/?cid=456' } },
    ] },
  })
  const lunch = enriched.days[0].activities.find((activity) => activity.id.endsWith('-lunch'))
  const dinner = enriched.days[0].activities.find((activity) => activity.id.endsWith('-dinner'))
  assert.equal(lunch.title, 'Ăn trưa tại Nhà hàng Hoa Lư')
  assert.equal(lunch.sourceUrl, 'https://maps.google.com/?cid=123')
  assert.equal(lunch.placeId, 'places/ChIJexample123')
  assert.match(lunch.note, /chưa xác minh theo thực đơn/)
  assert.equal(dinner.title, 'Ăn tối tại Quán ăn Tam Cốc')
  assert.deepEqual(summarizePlan(enriched), before)
  const saved = toTripPayload(enriched, 'user-1')
  const restored = planFromRow({ ...saved, id: 'trip-1' })
  assert.equal(restored.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).placeId, lunch.placeId)
  assert.equal(restored.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).sourceUrl, lunch.sourceUrl)
})

test('không gắn quán nếu tên không có trong nguồn Maps hoặc liên kết không hợp lệ', () => {
  const plan = generatePlan(form)
  const enriched = applyGroundedRestaurants(plan, {
    content: { parts: [{ text: 'NGAY 1 TRUA: Quán bịa ra' }] },
    groundingMetadata: { groundingChunks: [
      { maps: { title: 'Nhà hàng Hoa Lư', uri: 'https://maps.google.com/?cid=123' } },
      { maps: { title: 'Quán bịa ra', uri: 'https://example.com/restaurant' } },
    ] },
  })
  assert.equal(enriched, plan)
})

test('lỗi tra cứu quán không cản việc tạo lịch trình', async () => {
  const plan = generatePlan(form)
  const result = await suggestRestaurants(plan, { geminiApiKey: 'test', geminiModel: 'test-model' }, {
    fetchImpl: async () => { throw new Error('network unavailable') },
  })
  assert.equal(result, plan)
})

test('Gemini thường gợi ý tên quán và giữ chi phí dự toán', async () => {
  const plan = generatePlan(form)
  let requestBody
  const result = await suggestRestaurants(plan, { geminiApiKey: 'test', geminiModel: 'test-model' }, {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body)
      return {
        ok: true,
        json: async () => ({ candidates: [{
          content: { parts: [{ text: '**NGAY 1 TRUA:** Nhà hàng Hoa Lư' }] },
        }] }),
      }
    },
  })
  assert.equal(requestBody.tools, undefined)
  const lunch = result.days[0].activities.find((activity) => activity.id.endsWith('-lunch'))
  assert.equal(lunch.source, 'Gemini')
  assert.match(lunch.sourceUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/)
  assert.equal(lunch.note, '')
  assert.deepEqual(summarizePlan(result), summarizePlan(plan))
})

test('Maps Grounding vẫn dùng được khi bật và có nguồn phù hợp', async () => {
  const plan = generatePlan(form)
  const requestBodies = []
  const result = await suggestRestaurants(plan, { geminiApiKey: 'test', geminiModel: 'test-model', useMapsGrounding: true }, {
    fetchImpl: async (_url, init) => {
      requestBodies.push(JSON.parse(init.body))
      return { ok: true, json: async () => ({ candidates: [{
        content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư' }] },
        groundingMetadata: { groundingChunks: [{ maps: { title: 'Nhà hàng Hoa Lư', uri: 'https://maps.google.com/?cid=123' } }] },
      }] }) }
    },
  })
  assert.deepEqual(requestBodies[0].tools, [{ googleMaps: {} }])
  assert.equal(result.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).source, 'Google Maps')
})

test('Maps Grounding hết quota thì Gemini thường vẫn gợi ý quán', async () => {
  const plan = generatePlan(form)
  const requestBodies = []
  const result = await suggestRestaurants(plan, { geminiApiKey: 'test', geminiModel: 'test-model', useMapsGrounding: true }, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body)
      requestBodies.push(body)
      if (body.tools) return { ok: false, status: 429 }
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư' }] } }] }) }
    },
  })
  assert.deepEqual(requestBodies[0].tools, [{ googleMaps: {} }])
  assert.equal(requestBodies[1].tools, undefined)
  assert.equal(result.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).source, 'Gemini')
})

test('không nhận quán thiếu tên cụ thể', () => {
  const plan = generatePlan(form)
  const result = applyUnverifiedRestaurants(plan, { content: { parts: [{ text: 'NGAY 1 TRUA: Quán ăn' }] } })
  assert.equal(result, plan)
})

test('không ghi đè tên quán người dùng tự nhập', () => {
  const plan = generatePlan({ ...form, endDate: form.startDate })
  const lunch = plan.days[0].activities.find((activity) => activity.id.endsWith('-lunch'))
  lunch.title = 'Ăn trưa tại quán tự chọn'
  assert.equal(hasMissingRestaurants(plan), false)
  assert.equal(applyUnverifiedRestaurants(plan, { content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư' }] } }), plan)
})

test('ẩn ghi chú Gemini cũ khi mở lại chuyến đã lưu', () => {
  const plan = generatePlan({ ...form, endDate: form.startDate })
  const enriched = applyUnverifiedRestaurants(plan, { content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư' }] } })
  const saved = toTripPayload(enriched, 'user-1')
  const lunch = saved.itinerary.days[0].activities.find((activity) => activity.id.endsWith('-lunch'))
  lunch.note = 'Gemini gợi ý tên quán; địa điểm, giờ mở cửa và đánh giá chưa được xác minh. Hãy kiểm tra trên Google Maps trước khi đi. Giá bữa ăn là dự toán, chưa xác minh theo thực đơn.'
  const restored = planFromRow({ ...saved, id: 'trip-1' })
  assert.equal(restored.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).note, '')
})
