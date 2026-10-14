import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dailySignupCounts, signupWindowStart } from '../lib/adminAnalytics'

const FETCH_SIZE = 500
const MAX_DAYS = 30

export default function DailySignupsChart({ refreshKey }) {
  const [period, setPeriod] = useState(7)
  const [chartData, setChartData] = useState({ users: [], now: new Date(), loading: true, error: '' })

  useEffect(() => {
    let active = true
    async function loadSignups() {
      const now = new Date()
      const users = []
      try {
        for (let offset = 0; ; offset += FETCH_SIZE) {
          const { data, error } = await supabase.from('app_users')
            .select('id,created_at')
            .gte('created_at', signupWindowStart(MAX_DAYS, now))
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + FETCH_SIZE - 1)
          if (error) throw error
          users.push(...(data || []))
          if ((data || []).length < FETCH_SIZE) break
        }
        if (active) setChartData({ users, now, loading: false, error: '' })
      } catch {
        if (active) setChartData({ users: [], now, loading: false, error: 'Không tải được dữ liệu người dùng mới. Hãy kiểm tra quyền admin và kết nối Supabase.' })
      }
    }
    loadSignups()
    return () => { active = false }
  }, [refreshKey])

  const series = dailySignupCounts(chartData.users, period, chartData.now)
  const total = series.reduce((sum, day) => sum + day.count, 0)
  const peak = Math.max(0, ...series.map((day) => day.count))

  return <section className="admin-analytics" aria-labelledby="admin-analytics-heading">
    <div className="admin-analytics-heading">
      <div><span className="section-kicker">PHÂN TÍCH NGƯỜI DÙNG</span><h2 id="admin-analytics-heading">Tài khoản tham gia theo ngày</h2><p>Tính trên tài khoản hiện có, theo giờ Việt Nam.</p></div>
      <div className="admin-analytics-period" role="group" aria-label="Khoảng thời gian biểu đồ">
        {[7, 30].map((days) => <button type="button" key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} ngày</button>)}
      </div>
    </div>
    {chartData.error ? <p className="admin-analytics-message" role="alert">{chartData.error}</p> : chartData.loading ? <p className="admin-analytics-message" role="status">Đang tải biểu đồ...</p> : <>
      <div className="admin-analytics-summary"><div><span>Trong {period} ngày</span><strong>{total}</strong><small>tài khoản mới</small></div><div><span>Cao nhất một ngày</span><strong>{peak}</strong><small>tài khoản</small></div><div><span>Hôm nay</span><strong>{series[series.length - 1]?.count || 0}</strong><small>tài khoản mới</small></div></div>
      <div className="admin-chart-scroll" role="region" aria-label="Biểu đồ tài khoản mới theo ngày" tabIndex={0}>
        <ol className={`admin-chart-bars${period === 30 ? ' is-month' : ''}`} aria-label={`Số tài khoản mới từng ngày trong ${period} ngày gần nhất`}>
          {series.map((day) => <li key={day.key} aria-label={`${day.key}: ${day.count} tài khoản mới`}>
            <div className="admin-chart-plot"><span className="admin-chart-column" style={{ height: `${day.count ? Math.max(4, day.count / peak * 100) : 0}%` }}><span className="admin-chart-value">{day.count}</span></span></div>
            <time dateTime={day.key}>{day.label}</time>
          </li>)}
        </ol>
      </div>
      {total === 0 && <p className="admin-analytics-empty">Chưa có tài khoản mới trong khoảng thời gian này.</p>}
    </>}
  </section>
}
