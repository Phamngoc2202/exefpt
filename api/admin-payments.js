import {
  authClient, bearerToken, paymentEnvironment, readJsonBody, sendJson, serviceClient,
} from '../src/server/paymentServer.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_USERS = 20
const FETCH_SIZE = 500

function summarizeOrders(userIds, orders) {
  const summaries = Object.fromEntries(userIds.map((id) => [id, {
    purchaseCount: 0, totalSpentVnd: 0, lastPaidAt: null, plans: {},
  }]))

  for (const order of orders) {
    const summary = summaries[order.user_id]
    if (!summary) continue
    const amount = Number(order.amount_vnd)
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('invalid_payment_amount')
    summary.purchaseCount += 1
    summary.totalSpentVnd += amount
    if (!Number.isSafeInteger(summary.totalSpentVnd)) throw new Error('payment_total_overflow')
    if (!summary.lastPaidAt || (order.paid_at && order.paid_at > summary.lastPaidAt)) {
      summary.lastPaidAt = order.paid_at
    }
    const plan = summary.plans[order.plan_key] || { purchaseCount: 0, totalSpentVnd: 0 }
    plan.purchaseCount += 1
    plan.totalSpentVnd += amount
    summary.plans[order.plan_key] = plan
  }

  return summaries
}

export function createAdminPaymentsHandler(overrides = {}) {
  const makeAuthClient = overrides.authClientFactory || authClient
  const makeServiceClient = overrides.serviceClientFactory || serviceClient

  return async function adminPaymentsHandler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      sendJson(response, 405, { error: 'Phương thức không được hỗ trợ.' })
      return
    }

    const env = paymentEnvironment(overrides)
    if (!env.supabaseUrl || !env.publishableKey || !env.secretKey) {
      sendJson(response, 503, { error: 'Chưa cấu hình kết nối Supabase trên máy chủ.' })
      return
    }

    const token = bearerToken(request)
    if (!token) {
      sendJson(response, 401, { error: 'Vui lòng đăng nhập.' })
      return
    }

    try {
      const { data: identity, error: authError } = await makeAuthClient(env).auth.getUser(token)
      if (authError || !identity?.user?.id) {
        sendJson(response, 401, { error: 'Phiên đăng nhập đã hết hạn.' })
        return
      }

      const supabase = makeServiceClient(env)
      const { data: account, error: accountError } = await supabase.from('app_users')
        .select('role').eq('id', identity.user.id).maybeSingle()
      if (accountError) throw accountError
      if (account?.role !== 'admin') {
        sendJson(response, 403, { error: 'Chỉ quản trị viên được xem dữ liệu thanh toán.' })
        return
      }

      let body
      try { body = await readJsonBody(request) } catch {
        sendJson(response, 400, { error: 'Dữ liệu yêu cầu không hợp lệ.' })
        return
      }
      const userIds = body?.userIds
      if (!Array.isArray(userIds) || userIds.length > MAX_USERS
        || userIds.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))) {
        sendJson(response, 400, { error: 'Danh sách tài khoản không hợp lệ.' })
        return
      }

      const uniqueIds = [...new Set(userIds)]
      const orders = []
      if (uniqueIds.length) {
        for (let offset = 0; ; offset += FETCH_SIZE) {
          const { data, error } = await supabase.from('payment_orders')
            .select('id,user_id,plan_key,amount_vnd,paid_at')
            .in('user_id', uniqueIds).eq('status', 'paid')
            .order('id', { ascending: true }).range(offset, offset + FETCH_SIZE - 1)
          if (error) throw error
          orders.push(...(data || []))
          if ((data || []).length < FETCH_SIZE) break
        }
      }

      sendJson(response, 200, { summaries: summarizeOrders(uniqueIds, orders) })
    } catch (error) {
      console.error('admin-payments:', error?.message || error)
      sendJson(response, 500, { error: 'Không tải được dữ liệu thanh toán.' })
    }
  }
}

export default createAdminPaymentsHandler()
