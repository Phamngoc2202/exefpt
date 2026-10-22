import assert from 'node:assert/strict'
import test from 'node:test'
import { createSuggestRestaurantsHandler } from '../api/suggest-restaurants.js'
import { generatePlan, toTripPayload } from '../src/lib/tripPlanner.js'
import { applyUnverifiedRestaurants } from '../src/lib/restaurantSuggestions.js'

const tripId = '12345678-1234-4123-8123-123456789abc'
const form = {
  destination: 'Ninh Bình', origin: 'Hà Nội', startDate: '2026-10-21', endDate: '2026-10-21',
  travelers: 2, budget: 2000000, travelWith: 'Cặp đôi', style: 'Cân bằng', interests: [],
}
const row = { ...toTripPayload(generatePlan(form), 'owner-1'), id: tripId, updated_at: '2026-10-21T07:00:00Z' }

function response() {
  return { setHeader() {}, end(body) { this.body = JSON.parse(body) } }
}

test('không cho khách chưa đăng nhập cập nhật gợi ý quán', async () => {
  let created = false
  const handler = createSuggestRestaurantsHandler({
    supabaseUrl: 'https://example.supabase.co', supabaseKey: 'publishable', geminiApiKey: 'gemini',
    createClientImpl: () => { created = true; throw new Error('should not query database') },
  })
  const reply = response()
  await handler({ method: 'POST', headers: {}, body: { tripId } }, reply)
  assert.equal(reply.statusCode, 401)
  assert.equal(created, false)
})

test('chỉ cập nhật itinerary của chuyến đi thuộc chủ tài khoản, giữ nguyên các trường chi phí', async () => {
  const calls = []
  let updateValue
  const handler = createSuggestRestaurantsHandler({
    supabaseUrl: 'https://example.supabase.co', supabaseKey: 'publishable', geminiApiKey: 'gemini',
    createClientImpl: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } }, error: null }) },
      from(table) {
        assert.equal(table, 'trips')
        return {
          select() { return this },
          eq(column, value) { calls.push([column, value]); return this },
          update(value) { updateValue = value; return this },
          async maybeSingle() {
            return { data: updateValue ? { ...row, ...updateValue, updated_at: '2026-10-21T07:01:00Z' } : row, error: null }
          },
        }
      },
    }),
    suggestRestaurantsImpl: async (plan) => applyUnverifiedRestaurants(plan, {
      content: { parts: [{ text: 'NGAY 1 TRUA: Nhà hàng Hoa Lư' }] },
    }),
  })
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { tripId } }, reply)
  assert.equal(reply.statusCode, 200)
  assert.equal(reply.body.updated, true)
  assert.deepEqual(Object.keys(updateValue), ['itinerary'])
  assert.deepEqual(calls, [
    ['id', tripId], ['user_id', 'owner-1'], ['id', tripId], ['updated_at', row.updated_at],
  ])
  assert.equal(updateValue.itinerary.days[0].activities.find((activity) => activity.id.endsWith('-lunch')).source, 'Gemini')
  assert.equal(reply.body.trip.budget, row.budget)
})
