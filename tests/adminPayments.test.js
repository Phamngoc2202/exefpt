import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminPaymentsHandler } from '../api/admin-payments.js'

const adminId = '11111111-1111-4111-8111-111111111111'
const buyerId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(body) { this.body = JSON.parse(body) },
  }
}

function handlerFor(role, orders, calls) {
  return createAdminPaymentsHandler({
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'publishable',
    secretKey: 'server-secret',
    authClientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: adminId } }, error: null }) } }),
    serviceClientFactory: () => ({
      from(table) {
        calls.push(table)
        if (table === 'app_users') return {
          select() { return this }, eq() { return this },
          async maybeSingle() { return { data: { role }, error: null } },
        }
        return {
          select() { return this }, in() { return this },
          eq(field, value) {
            assert.equal(field, 'status')
            assert.equal(value, 'paid')
            return this
          },
          order() { return this },
          async range(from, to) { return { data: orders.slice(from, to + 1), error: null } },
        }
      },
    }),
  })
}

test('non-admin cannot read payment totals', async () => {
  const calls = []
  const handler = handlerFor('user', [], calls)
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { userIds: [buyerId] } }, reply)

  assert.equal(reply.statusCode, 403)
  assert.deepEqual(calls, ['app_users'])
})

test('admin sees every paid purchase grouped by account and package', async () => {
  const calls = []
  const orders = Array.from({ length: 500 }, (_, index) => ({
    user_id: buyerId,
    plan_key: 'single_trip',
    amount_vnd: 20_000,
    paid_at: `2026-10-21T00:${String(index % 60).padStart(2, '0')}:00Z`,
  }))
  orders.push({ user_id: buyerId, plan_key: 'plus', amount_vnd: 99_000, paid_at: '2026-10-22T00:00:00Z' })
  const handler = handlerFor('admin', orders, calls)
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { userIds: [buyerId, otherId] } }, reply)

  assert.equal(reply.statusCode, 200)
  assert.deepEqual(calls, ['app_users', 'payment_orders', 'payment_orders'])
  assert.deepEqual(reply.body.summaries[buyerId], {
    purchaseCount: 501,
    totalSpentVnd: 10_099_000,
    lastPaidAt: '2026-10-22T00:00:00Z',
    plans: {
      single_trip: { purchaseCount: 500, totalSpentVnd: 10_000_000 },
      plus: { purchaseCount: 1, totalSpentVnd: 99_000 },
    },
  })
  assert.deepEqual(reply.body.summaries[otherId], {
    purchaseCount: 0, totalSpentVnd: 0, lastPaidAt: null, plans: {},
  })
})
