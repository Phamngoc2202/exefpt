import { paymentPlan } from '../src/lib/paymentPlans.js'
import {
  authClient, bearerToken, newPaymentCode, paymentEnvironment,
  qrImageUrl, readJsonBody, sendJson, serviceClient, validPaymentEnvironment,
} from '../src/server/paymentServer.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function publicOrder(row, env) {
  const status = row.status === 'pending' && new Date(row.expires_at) <= new Date() ? 'expired' : row.status
  return {
    id: row.id,
    planKey: row.plan_key,
    amountVnd: row.amount_vnd,
    credits: row.credits,
    code: row.code,
    status,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    bank: 'BIDV',
    receiverVa: row.receiver_va,
    receiverName: env.receiverName,
    qrUrl: status === 'pending' ? qrImageUrl(row.receiver_va, row.amount_vnd, row.code) : null,
    mode: env.mode,
  }
}

export function createPaymentOrdersHandler(overrides = {}) {
  const makeAuthClient = overrides.authClientFactory || authClient
  const makeServiceClient = overrides.serviceClientFactory || serviceClient
  return async function paymentOrdersHandler(request, response) {
    if (!['GET', 'POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }

    const env = paymentEnvironment(overrides)
    if (!validPaymentEnvironment(env, true)) {
      sendJson(response, 503, { error: 'Thanh toán SePay chưa được cấu hình trên máy chủ.' })
      return
    }

    const token = bearerToken(request)
    if (!token) {
      sendJson(response, 401, { error: 'Vui lòng đăng nhập để thanh toán.' })
      return
    }

    try {
      const { data: identity, error: authError } = await makeAuthClient(env).auth.getUser(token)
      if (authError || !identity?.user?.id) {
        sendJson(response, 401, { error: 'Phiên đăng nhập đã hết hạn.' })
        return
      }

      const supabase = makeServiceClient(env)
      const userId = identity.user.id

      if (request.method === 'GET') {
        const id = new URL(request.url || '/', 'http://localhost').searchParams.get('id')
        if (!UUID_PATTERN.test(id || '')) {
          sendJson(response, 400, { error: 'Mã đơn hàng không hợp lệ.' })
          return
        }
        const { data, error } = await supabase.from('payment_orders').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (!data) {
          sendJson(response, 404, { error: 'Không tìm thấy đơn hàng.' })
          return
        }
        sendJson(response, 200, { order: publicOrder(data, env) })
        return
      }

      const { data: paymentSettings, error: settingsError } = await supabase
        .from('payment_settings').select('enabled').eq('id', 1).maybeSingle()
      if (settingsError || !paymentSettings) {
        sendJson(response, 503, { error: 'Thanh toán hiện chưa sẵn sàng. Vui lòng thử lại sau.' })
        return
      }
      if (!paymentSettings.enabled) {
        sendJson(response, 503, { error: 'Thanh toán đang tạm tắt. Vui lòng quay lại sau.', code: 'payments_disabled' })
        return
      }

      let body
      try { body = await readJsonBody(request) } catch {
        sendJson(response, 400, { error: 'Dữ liệu yêu cầu không hợp lệ.' })
        return
      }
      const planKey = body.planKey
      const plan = paymentPlan(planKey)
      if (!plan) {
        sendJson(response, 400, { error: 'Gói thanh toán không hợp lệ.' })
        return
      }

      const now = new Date()
      const { data: existing, error: existingError } = await supabase.from('payment_orders')
        .select('*').eq('user_id', userId).eq('plan_key', planKey).eq('status', 'pending')
        .eq('receiver_va', env.receiverVa)
        .gt('expires_at', now.toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        sendJson(response, 200, { order: publicOrder(existing, env) })
        return
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase.from('payment_orders').insert({
          user_id: userId,
          plan_key: planKey,
          amount_vnd: plan.amountVnd,
          credits: plan.credits,
          code: newPaymentCode(),
          receiver_va: env.receiverVa,
        }).select('*').single()
        if (!error && data) {
          sendJson(response, 201, { order: publicOrder(data, env) })
          return
        }
        if (error?.message?.includes('payments_disabled')) {
          sendJson(response, 503, { error: 'Thanh toán đang tạm tắt. Vui lòng quay lại sau.', code: 'payments_disabled' })
          return
        }
        if (error?.code !== '23505') throw error || new Error('payment_order_create_failed')
      }
      throw new Error('payment_code_conflict')
    } catch (error) {
      console.error('payment-orders:', error?.message || error)
      sendJson(response, 500, { error: 'Không thể tạo hoặc đọc đơn thanh toán. Kiểm tra cấu hình Supabase.' })
    }
  }
}

export default createPaymentOrdersHandler()
