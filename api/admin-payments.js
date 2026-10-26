import {
  authClient, bearerToken, paymentEnvironment, readJsonBody, sendJson, serviceClient,
} from '../src/server/paymentServer.js'

const PAGE_SIZE = 20
const FETCH_SIZE = 500
const USAGE_DAYS = 30
const PURCHASE_FILTERS = new Set(['all', 'has_plan', 'purchased', 'not_purchased', 'single_trip', 'plus', 'team', 'demo'])
const SORT_ORDERS = new Set(['newest', 'highest_spend', 'most_active'])
const vietnamDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
})

function vietnamDateKey(value = new Date()) {
  const parts = Object.fromEntries(vietnamDateFormatter.formatToParts(value).map(({ type, value: part }) => [type, part]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function recentDateKeys(days, now = new Date()) {
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number)
  const today = Date.UTC(year, month - 1, day)
  return Array.from({ length: days }, (_, index) => new Date(today - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10))
}

function summarizeOrders(users, orders) {
  const summaries = Object.fromEntries(users.map(({ id }) => [id, {
    purchaseCount: 0, totalSpentVnd: 0, lastPaidAt: null, plans: {},
    demoPurchaseCount: 0, demoAmountVnd: 0, demoPlans: {},
  }]))

  for (const order of orders) {
    const summary = summaries[order.user_id]
    if (!summary) continue
    const amount = Number(order.amount_vnd)
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('invalid_payment_amount')
    const isDemo = order.receiver_va === 'DEMO'
    if (isDemo) {
      summary.demoPurchaseCount += 1
      summary.demoAmountVnd += amount
      if (!Number.isSafeInteger(summary.demoAmountVnd)) throw new Error('payment_total_overflow')
      const plan = summary.demoPlans[order.plan_key] || { purchaseCount: 0, amountVnd: 0 }
      plan.purchaseCount += 1
      plan.amountVnd += amount
      summary.demoPlans[order.plan_key] = plan
      continue
    }
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

async function fetchUsageData(supabase) {
  const dateKeys = recentDateKeys(USAGE_DAYS)
  try {
    const [totals, daily] = await Promise.all([
      fetchAll(() => supabase.from('user_usage_totals')
        .select('user_id,total_active_seconds,total_sessions,last_active_at')
        .order('user_id', { ascending: true })),
      fetchAll(() => supabase.from('user_usage_daily')
        .select('user_id,activity_date,active_seconds,last_active_at')
        .gte('activity_date', dateKeys[0])
        .order('activity_date', { ascending: true }).order('user_id', { ascending: true })),
    ])
    return { available: true, totals, daily, dateKeys }
  } catch (error) {
    console.warn('admin-usage:', error?.message || error)
    return { available: false, totals: [], daily: [], dateKeys }
  }
}

function summarizeUsage(users, usageData) {
  const userIds = new Set(users.map(({ id }) => id))
  const summaries = Object.fromEntries(users.map(({ id }) => [id, {
    totalSeconds: 0, totalSessions: 0, todaySeconds: 0, last7Seconds: 0, lastActiveAt: null,
  }]))
  const last7Keys = new Set(usageData.dateKeys.slice(-7))
  const todayKey = usageData.dateKeys.at(-1)
  const dailyByDate = Object.fromEntries(usageData.dateKeys.map((date) => [date, { date, seconds: 0, users: 0 }]))
  const activeUsersByDate = Object.fromEntries(usageData.dateKeys.map((date) => [date, new Set()]))

  let totalSeconds = 0
  let totalSessions = 0
  for (const row of usageData.totals) {
    if (!userIds.has(row.user_id)) continue
    const summary = summaries[row.user_id]
    summary.totalSeconds = Math.max(0, Number(row.total_active_seconds) || 0)
    summary.totalSessions = Math.max(0, Number(row.total_sessions) || 0)
    summary.lastActiveAt = row.last_active_at || null
    totalSeconds += summary.totalSeconds
    totalSessions += summary.totalSessions
  }

  for (const row of usageData.daily) {
    if (!userIds.has(row.user_id) || !dailyByDate[row.activity_date]) continue
    const seconds = Math.max(0, Number(row.active_seconds) || 0)
    const summary = summaries[row.user_id]
    if (row.activity_date === todayKey) summary.todaySeconds += seconds
    if (last7Keys.has(row.activity_date)) summary.last7Seconds += seconds
    dailyByDate[row.activity_date].seconds += seconds
    activeUsersByDate[row.activity_date].add(row.user_id)
  }

  const daily = usageData.dateKeys.map((date) => ({
    ...dailyByDate[date], users: activeUsersByDate[date].size,
  }))
  const last7Seconds = daily.slice(-7).reduce((sum, day) => sum + day.seconds, 0)
  const last7Users = new Set(usageData.daily
    .filter((row) => userIds.has(row.user_id) && last7Keys.has(row.activity_date))
    .map((row) => row.user_id)).size

  return {
    summaries,
    analytics: {
      available: usageData.available,
      daily,
      totalSeconds,
      totalSessions,
      trackedUsers: usageData.totals.filter((row) => userIds.has(row.user_id)).length,
      todaySeconds: daily.at(-1)?.seconds || 0,
      todayUsers: daily.at(-1)?.users || 0,
      last7Seconds,
      last7Users,
    },
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

      const [users, orders, usageData] = await Promise.all([
        fetchAll(() => supabase.from('app_users')
          .select('id,email,role,generations_used,bonus_generations,created_at')
          .not('email_confirmed_at', 'is', null)
          .order('created_at', { ascending: false }).order('id', { ascending: false })),
        fetchAll(() => supabase.from('payment_orders')
          .select('id,user_id,plan_key,amount_vnd,paid_at,receiver_va')
          .eq('status', 'paid').order('id', { ascending: true })),
        fetchUsageData(supabase),
      ])
      const summaries = summarizeOrders(users, orders)
      const usage = summarizeUsage(users, usageData)
      const emailSearch = search.trim().toLocaleLowerCase()
      const matching = users.filter((user) => {
        if (emailSearch && !user.email?.toLocaleLowerCase().includes(emailSearch)) return false
        const payment = summaries[user.id]
        if (purchaseFilter === 'has_plan') return payment.purchaseCount > 0 || payment.demoPurchaseCount > 0
        if (purchaseFilter === 'purchased') return payment.purchaseCount > 0
        if (purchaseFilter === 'not_purchased') return payment.purchaseCount === 0 && payment.demoPurchaseCount === 0
        if (purchaseFilter === 'demo') return payment.demoPurchaseCount > 0
        if (purchaseFilter !== 'all') return Boolean(payment.plans[purchaseFilter] || payment.demoPlans[purchaseFilter])
        return true
      })
      if (sortOrder === 'highest_spend') {
        matching.sort((a, b) => summaries[b.id].totalSpentVnd - summaries[a.id].totalSpentVnd
          || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
      } else if (sortOrder === 'most_active') {
        matching.sort((a, b) => usage.summaries[b.id].totalSeconds - usage.summaries[a.id].totalSeconds
          || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
      }
      const pageUsers = matching.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      const pageSummaries = Object.fromEntries(pageUsers.map(({ id }) => [id, summaries[id]]))
      const pageUsageSummaries = Object.fromEntries(pageUsers.map(({ id }) => [id, usage.summaries[id]]))

      sendJson(response, 200, {
        users: pageUsers,
        total: matching.length,
        summaries: pageSummaries,
        usageSummaries: pageUsageSummaries,
        usageAnalytics: usage.analytics,
      })
    } catch (error) {
      console.error('admin-payments:', error?.message || error)
      sendJson(response, 500, { error: 'Không tải được danh sách tài khoản và thanh toán.' })
    }
  }
}

export default createAdminPaymentsHandler()
