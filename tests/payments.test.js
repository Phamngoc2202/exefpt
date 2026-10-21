import assert from 'node:assert/strict'
import test from 'node:test'
import { createPaymentOrdersHandler } from '../api/payment-orders.js'
import { createSePayWebhookHandler } from '../api/sepay-webhook.js'

const environment = {
  supabaseUrl: 'https://example.supabase.co',
  publishableKey: 'publishable',
  secretKey: 'server-secret',
  receiverVa: '96247DEMO01',
  receiverName: 'TRIPGENIE TEST',
  webhookKey: 'a-long-random-webhook-key-for-tests',
  mode: 'test',
}

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(body) { this.body = JSON.parse(body) },
  }
}

test('SePay webhook refuses a forged key and unrelated VA before reaching the database', async () => {
  const calls = []
  const handler = createSePayWebhookHandler({
    ...environment,
    serviceClientFactory: () => ({ rpc: async (...args) => { calls.push(args); return { data: 'paid', error: null } } }),
  })
  const transaction = {
    id: 92704,
    accountNumber: '8899741553',
    subAccount: environment.receiverVa,
    transferType: 'in',
    transferAmount: 99_000,
    content: 'thanh toan TGABCDEF1234',
  }

  const forged = response()
  await handler({ method: 'POST', headers: { authorization: 'Apikey wrong' }, body: transaction }, forged)
  assert.equal(forged.statusCode, 401)

  const otherVa = response()
  await handler({ method: 'POST', headers: { authorization: `Apikey ${environment.webhookKey}` }, body: { ...transaction, subAccount: '96247OTHER' } }, otherVa)
  assert.equal(otherVa.statusCode, 200)
  assert.deepEqual(otherVa.body, { success: true })
  assert.equal(calls.length, 0)

  const valid = response()
  await handler({ method: 'POST', headers: { authorization: `Apikey ${environment.webhookKey}` }, body: transaction }, valid)
  assert.equal(valid.statusCode, 200)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], ['confirm_sepay_payment', {
    p_transaction_id: 92704,
    p_code: 'TGABCDEF1234',
    p_amount_vnd: 99_000,
    p_receiver_va: environment.receiverVa,
    p_content: transaction.content,
  }])
})

test('payment order price and owner come from the server and verified login', async () => {
  let inserted
  let fromCount = 0
  const handler = createPaymentOrdersHandler({
    ...environment,
    authClientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'verified-user' } }, error: null }) } }),
    serviceClientFactory: () => ({
      from: () => {
        fromCount += 1
        if (fromCount === 1) return {
          select() { return this }, eq() { return this }, gt() { return this },
          order() { return this }, limit() { return this },
          async maybeSingle() { return { data: null, error: null } },
        }
        return {
          insert(values) { inserted = values; return this },
          select() { return this },
          async single() {
            return { data: { ...inserted, id: 'order-1', status: 'pending', expires_at: new Date(Date.now() + 86_400_000).toISOString(), paid_at: null }, error: null }
          },
        }
      },
    }),
  })
  const reply = response()
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: { planKey: 'plus', amountVnd: 1, userId: 'attacker' },
  }, reply)

  assert.equal(reply.statusCode, 201)
  assert.equal(inserted.user_id, 'verified-user')
  assert.equal(inserted.amount_vnd, 99_000)
  assert.equal(inserted.credits, 20)
  assert.equal(inserted.receiver_va, environment.receiverVa)
  assert.match(inserted.code, /^TG[0-9A-F]{10}$/)
  assert.equal(new URL(reply.body.order.qrUrl).searchParams.get('des'), inserted.code)
})
