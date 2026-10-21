import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminPaymentsHandler } from '../api/admin-payments.js'

const adminId = '11111111-1111-4111-8111-111111111111'
const buyerId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'
const filters = { pageIndex: 0, search: '', purchaseFilter: 'all', sortOrder: 'newest' }

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(body) { this.body = JSON.parse(body) },
  }
}

function handlerFor(role, users, orders, calls) {
  return createAdminPaymentsHandler({
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'publishable',
    secretKey: 'server-secret',
    authClientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: adminId } }, error: null }) } }),
    serviceClientFactory: () => ({
      from(table) {
        calls.push(table)
        if (table === 'app_users') return {
          select() { return this }, eq() { return this }, order() { return this },
          async maybeSingle() { return { data: { role }, error: null } },
          async range(from, to) { return { data: users.slice(from, to + 1), error: null } },
        }
        return {
          select() { return this }, order() { return this },
          eq(field, value) {
            assert.equal(field, 'status')
            assert.equal(value, 'paid')
            return this
          },
          async range(from, to) { return { data: orders.slice(from, to + 1), error: null } },
        }
      },
    }),
  })
}

test('non-admin cannot list account purchases or spending', async () => {
  const calls = []
  const handler = handlerFor('user', [], [], calls)
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: filters }, reply)

  assert.equal(reply.statusCode, 403)
  assert.deepEqual(calls, ['app_users'])
})

test('purchase filter applies across all users before pagination and sums all paid orders', async () => {
  const calls = []
  const users = Array.from({ length: 25 }, (_, index) => ({
    id: index === 22 ? buyerId : index === 1 ? otherId : `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    email: `user${index}@gmail.com`, role: 'user', generations_used: 0, bonus_generations: 0,
    created_at: `2026-10-${String(25 - index).padStart(2, '0')}T00:00:00Z`,
  }))
  const orders = Array.from({ length: 500 }, () => ({
    user_id: buyerId, plan_key: 'single_trip', amount_vnd: 20_000, paid_at: '2026-10-21T00:00:00Z',
  }))
  orders.push({ user_id: buyerId, plan_key: 'plus', amount_vnd: 99_000, paid_at: '2026-10-22T00:00:00Z' })
  orders.push({ user_id: otherId, plan_key: 'team', amount_vnd: 349_000, paid_at: '2026-10-22T00:00:00Z' })
  const handler = handlerFor('admin', users, orders, calls)
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'plus' } }, reply)

  assert.equal(reply.statusCode, 200)
  assert.equal(reply.body.total, 1)
  assert.deepEqual(reply.body.users.map((user) => user.id), [buyerId])
  assert.equal(reply.body.summaries[buyerId].purchaseCount, 501)
  assert.equal(reply.body.summaries[buyerId].totalSpentVnd, 10_099_000)
  assert.deepEqual(reply.body.summaries[buyerId].plans.plus, { purchaseCount: 1, totalSpentVnd: 99_000 })
  assert.equal(calls.filter((table) => table === 'payment_orders').length, 2)

  const unpaid = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'not_purchased' } }, unpaid)
  assert.equal(unpaid.body.total, 23)
  assert.equal(unpaid.body.users.length, 20)
  assert.equal(unpaid.body.users.some((user) => user.id === buyerId || user.id === otherId), false)

  const unpaidNextPage = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, pageIndex: 1, purchaseFilter: 'not_purchased' } }, unpaidNextPage)
  assert.equal(unpaidNextPage.body.total, 23)
  assert.equal(unpaidNextPage.body.users.length, 3)

  const topSpenders = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'purchased', sortOrder: 'highest_spend' } }, topSpenders)
  assert.deepEqual(topSpenders.body.users.map((user) => user.id), [buyerId, otherId])
})
