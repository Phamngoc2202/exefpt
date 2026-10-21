import {
  authClient, bearerToken, paymentEnvironment, readJsonBody, sendJson, serviceClient,
} from '../src/server/paymentServer.js'

const PAGE_SIZE = 20
const FETCH_SIZE = 500
const PURCHASE_FILTERS = new Set(['all', 'purchased', 'not_purchased', 'single_trip', 'plus', 'team'])
const SORT_ORDERS = new Set(['newest', 'highest_spend'])

function summarizeOrders(users, orders) {
  const summaries = Object.fromEntries(users.map(({ id }) => [id, {
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

async function fetchAll(makeQuery) {
  const rows = []
  for (let offset = 0; ; offset += FETCH_SIZE) {
    const { data, error } = await makeQuery().range(offset, offset + FETCH_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if ((data || []).length < FETCH_SIZE) return rows
  }
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
      const { pageIndex, search, purchaseFilter, sortOrder } = body || {}
      if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex > 10_000
        || typeof search !== 'string' || search.length > 100
        || !PURCHASE_FILTERS.has(purchaseFilter) || !SORT_ORDERS.has(sortOrder)) {
        sendJson(response, 400, { error: 'Bộ lọc tài khoản không hợp lệ.' })
        return
      }

      const [users, orders] = await Promise.all([
        fetchAll(() => supabase.from('app_users')
          .select('id,email,role,generations_used,bonus_generations,created_at')
          .order('created_at', { ascending: false }).order('id', { ascending: false })),
        fetchAll(() => supabase.from('payment_orders')
          .select('id,user_id,plan_key,amount_vnd,paid_at')
          .eq('status', 'paid').order('id', { ascending: true })),
      ])
      const summaries = summarizeOrders(users, orders)
      const emailSearch = search.trim().toLocaleLowerCase()
      const matching = users.filter((user) => {
        if (emailSearch && !user.email?.toLocaleLowerCase().includes(emailSearch)) return false
        const payment = summaries[user.id]
        if (purchaseFilter === 'purchased') return payment.purchaseCount > 0
        if (purchaseFilter === 'not_purchased') return payment.purchaseCount === 0
        if (purchaseFilter !== 'all') return Boolean(payment.plans[purchaseFilter])
        return true
      })
      if (sortOrder === 'highest_spend') {
        matching.sort((a, b) => summaries[b.id].totalSpentVnd - summaries[a.id].totalSpentVnd
          || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
      }
      const pageUsers = matching.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      const pageSummaries = Object.fromEntries(pageUsers.map(({ id }) => [id, summaries[id]]))

      sendJson(response, 200, { users: pageUsers, total: matching.length, summaries: pageSummaries })
    } catch (error) {
      console.error('admin-payments:', error?.message || error)
      sendJson(response, 500, { error: 'Không tải được danh sách tài khoản và thanh toán.' })
    }
  }
}

export default createAdminPaymentsHandler()
