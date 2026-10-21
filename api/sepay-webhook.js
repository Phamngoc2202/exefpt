import {
  paymentCodeFromWebhook, paymentEnvironment, readJsonBody, secureEqual,
  sendJson, serviceClient, validPaymentEnvironment,
} from '../src/server/paymentServer.js'

export function createSePayWebhookHandler(overrides = {}) {
  const makeServiceClient = overrides.serviceClientFactory || serviceClient
  return async function sePayWebhookHandler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }

    const env = paymentEnvironment(overrides)
    if (!validPaymentEnvironment(env, true)) {
      sendJson(response, 503, { success: false })
      return
    }

    const suppliedKey = /^Apikey\s+(.+)$/i.exec(request.headers.authorization || '')?.[1]
    if (!secureEqual(suppliedKey, env.webhookKey)) {
      sendJson(response, 401, { success: false })
      return
    }

    let payload
    try { payload = await readJsonBody(request) } catch {
      sendJson(response, 400, { success: false })
      return
    }

    const transactionId = Number(payload.id)
    const amount = Number(payload.transferAmount)
    const receiverAccounts = [payload.subAccount, payload.accountNumber]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim().toUpperCase())
    const code = paymentCodeFromWebhook(payload)

    // A shared BIDV account may notify more than one website. Only this VA and
    // this app's order codes may change a TripGenie order.
    if (payload.transferType !== 'in' || !receiverAccounts.includes(env.receiverVa)
      || !Number.isSafeInteger(transactionId) || transactionId <= 0
      || !Number.isSafeInteger(amount) || amount <= 0 || !code) {
      sendJson(response, 200, { success: true })
      return
    }

    try {
      const { data, error } = await makeServiceClient(env).rpc('confirm_sepay_payment', {
        p_transaction_id: transactionId,
        p_code: code,
        p_amount_vnd: amount,
        p_receiver_va: env.receiverVa,
        p_content: String(payload.content || ''),
      })
      if (error) throw error
      if (data === 'ignored') console.warn('sepay-webhook: unmatched transaction', transactionId)
      sendJson(response, 200, { success: true })
    } catch (error) {
      console.error('sepay-webhook:', error?.message || error)
      sendJson(response, 500, { success: false })
    }
  }
}

export default createSePayWebhookHandler()
