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

function handlerFor(role, users, orders, calls, usageTotals = [], usageDaily = []) {
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
          not(field, operator, value) {
            assert.equal(field, 'email_confirmed_at')
            assert.equal(operator, 'is')
            assert.equal(value, null)
            this.confirmedOnly = true
            return this
          },
          async maybeSingle() { return { data: { role }, error: null } },
          async range(from, to) {
            const visible = this.confirmedOnly ? users.filter((user) => user.email_confirmed_at !== null) : users
            return { data: visible.slice(from, to + 1), error: null }
          },
        }
        if (table === 'payment_orders') return {
          select() { return this }, order() { return this },
          eq(field, value) {
            assert.equal(field, 'status')
            assert.equal(value, 'paid')
            return this
          },
          async range(from, to) { return { data: orders.slice(from, to + 1), error: null } },
        }
        if (table === 'user_usage_totals') return {
          select() { return this }, order() { return this },
          async range(from, to) { return { data: usageTotals.slice(from, to + 1), error: null } },
        }
        if (table === 'user_usage_daily') return {
          select() { return this }, order() { return this }, gte() { return this },
          async range(from, to) { return { data: usageDaily.slice(from, to + 1), error: null } },
        }
        throw new Error(`Unexpected table: ${table}`)
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

test('unconfirmed signups are absent from the account list and its total before pagination', async () => {
  const pending = Array.from({ length: 21 }, (_, index) => ({
    id: `pending-${index}`, email: `spam_user_${index}@gmail.com`, email_confirmed_at: null,
    created_at: '2026-10-23T00:00:00Z',
  }))
  const confirmed = [
    { id: buyerId, email: 'verified@gmail.com', email_confirmed_at: '2026-10-23T01:00:00Z', created_at: '2026-10-23T00:00:00Z' },
    { id: otherId, email: 'another@gmail.com', email_confirmed_at: '2026-10-23T01:00:00Z', created_at: '2026-10-23T00:00:00Z' },
  ]
  const handler = handlerFor('admin', [...pending, ...confirmed], [], [])
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: filters }, reply)

  assert.equal(reply.body.total, 2)
  assert.deepEqual(reply.body.users.map((user) => user.id), [buyerId, otherId])
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

test('demo grants remain separate from SePay spending and real purchase filters', async () => {
  const users = [
    { id: buyerId, email: 'real@gmail.com', created_at: '2026-10-20T00:00:00Z' },
    { id: otherId, email: 'sample@gmail.com', created_at: '2026-10-19T00:00:00Z' },
    { id: 'plus-account', email: 'plus@gmail.com', created_at: '2026-10-18T00:00:00Z' },
  ]
  const orders = [
    { user_id: buyerId, plan_key: 'single_trip', amount_vnd: 20_000, receiver_va: 'BANK-VA', paid_at: '2026-10-21T00:00:00Z' },
    { user_id: otherId, plan_key: 'single_trip', amount_vnd: 20_000, receiver_va: 'DEMO', paid_at: '2026-10-22T00:00:00Z' },
    { user_id: 'plus-account', plan_key: 'plus', amount_vnd: 99_000, receiver_va: 'DEMO', paid_at: '2026-10-22T00:00:00Z' },
  ]
  const handler = handlerFor('admin', users, orders, [])

  const samples = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'demo' } }, samples)
  assert.equal(samples.body.total, 2)
  assert.deepEqual(samples.body.users.map((user) => user.id), [otherId, 'plus-account'])
  assert.equal(samples.body.summaries[otherId].totalSpentVnd, 0)
  assert.equal(samples.body.summaries[otherId].demoAmountVnd, 20_000)
  assert.equal(samples.body.summaries[otherId].demoPurchaseCount, 1)
  assert.equal(samples.body.summaries['plus-account'].totalSpentVnd, 0)
  assert.equal(samples.body.summaries['plus-account'].demoAmountVnd, 99_000)
  assert.equal(samples.body.summaries['plus-account'].demoPlans.plus.purchaseCount, 1)

  const allPlans = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'has_plan' } }, allPlans)
  assert.equal(allPlans.body.total, 3)

  const realPurchases = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, purchaseFilter: 'purchased' } }, realPurchases)
  assert.deepEqual(realPurchases.body.users.map((user) => user.id), [buyerId])
  assert.equal(realPurchases.body.summaries[buyerId].totalSpentVnd, 20_000)
})

test('usage summaries include total, recent activity and most-active sorting', async () => {
  const users = [
    { id: buyerId, email: 'active@gmail.com', email_confirmed_at: '2026-10-20T00:00:00Z', created_at: '2026-10-20T00:00:00Z' },
    { id: otherId, email: 'quiet@gmail.com', email_confirmed_at: '2026-10-20T00:00:00Z', created_at: '2026-10-19T00:00:00Z' },
  ]
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]))
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`
  const totals = [
    { user_id: buyerId, total_active_seconds: 3600, total_sessions: 2, last_active_at: '2026-10-24T10:00:00Z' },
    { user_id: otherId, total_active_seconds: 300, total_sessions: 1, last_active_at: '2026-10-24T09:00:00Z' },
  ]
  const daily = [
    { user_id: buyerId, activity_date: today, active_seconds: 600, last_active_at: '2026-10-24T10:00:00Z' },
    { user_id: otherId, activity_date: today, active_seconds: 60, last_active_at: '2026-10-24T09:00:00Z' },
  ]
  const handler = handlerFor('admin', users, [], [], totals, daily)
  const reply = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { ...filters, sortOrder: 'most_active' } }, reply)

  assert.deepEqual(reply.body.users.map((user) => user.id), [buyerId, otherId])
  assert.equal(reply.body.usageSummaries[buyerId].totalSeconds, 3600)
  assert.equal(reply.body.usageSummaries[buyerId].todaySeconds, 600)
  assert.equal(reply.body.usageAnalytics.todaySeconds, 660)
  assert.equal(reply.body.usageAnalytics.todayUsers, 2)
  assert.equal(reply.body.usageAnalytics.totalSessions, 3)
})
