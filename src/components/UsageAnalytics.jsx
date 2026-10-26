import { useState } from 'react'
import { averageSessionSeconds, formatUsageDuration } from '../lib/usageAnalytics'

export default function UsageAnalytics({ analytics }) {
  const [period, setPeriod] = useState(7)

  if (!analytics) return <section className="admin-analytics admin-usage-analytics"><p className="admin-analytics-message" role="status">Đang tải thời gian sử dụng...</p></section>
  if (!analytics.available) return <section className="admin-analytics admin-usage-analytics"><div className="admin-analytics-heading"><div><span className="section-kicker">MỨC ĐỘ SỬ DỤNG</span><h2>Thời gian hoạt động trong ứng dụng</h2></div></div><p className="admin-analytics-message" role="alert">Chưa có bảng theo dõi. Hãy chạy usage_tracking.sql trong Supabase SQL Editor rồi tải lại trang.</p></section>

  const series = analytics.daily.slice(-period)
  const periodSeconds = series.reduce((sum, day) => sum + day.seconds, 0)
  const peak = Math.max(0, ...series.map((day) => day.seconds))
  const averageSession = averageSessionSeconds(analytics.totalSeconds, analytics.totalSessions)

  return <section className="admin-analytics admin-usage-analytics" aria-labelledby="admin-usage-heading">
    <div className="admin-analytics-heading">
      <div><span className="section-kicker">MỨC ĐỘ SỬ DỤNG</span><h2 id="admin-usage-heading">Thời gian hoạt động trong ứng dụng</h2><p>Chỉ tính lúc người dùng đã đăng nhập, đang mở tab và có hoạt động trong 5 phút gần nhất.</p></div>
      <div className="admin-analytics-period" role="group" aria-label="Khoảng thời gian sử dụng">
        {[7, 30].map((days) => <button type="button" key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} ngày</button>)}
      </div>
    </div>
    <div className="admin-analytics-summary admin-usage-summary">
      <div><span>Hôm nay</span><strong>{formatUsageDuration(analytics.todaySeconds)}</strong><small>{analytics.todayUsers} người hoạt động</small></div>
      <div><span>{period} ngày gần nhất</span><strong>{formatUsageDuration(periodSeconds)}</strong><small>{period === 7 ? analytics.last7Users : analytics.trackedUsers} người được ghi nhận</small></div>
      <div><span>Trung bình mỗi phiên</span><strong>{formatUsageDuration(averageSession)}</strong><small>{analytics.totalSessions} phiên đã ghi nhận</small></div>
      <div><span>Tổng từ khi bật</span><strong>{formatUsageDuration(analytics.totalSeconds)}</strong><small>{analytics.trackedUsers} tài khoản</small></div>
    </div>
    <div className="admin-chart-scroll" role="region" aria-label={`Biểu đồ thời gian sử dụng trong ${period} ngày`} tabIndex={0}>
      <ol className={`admin-chart-bars admin-usage-chart${period === 30 ? ' is-month' : ''}`}>
        {series.map((day) => <li key={day.date} aria-label={`${day.date}: ${formatUsageDuration(day.seconds)}, ${day.users} người dùng`}>
          <div className="admin-chart-plot"><span className="admin-chart-column" style={{ height: `${day.seconds && peak ? Math.max(4, day.seconds / peak * 100) : 0}%` }}><span className="admin-chart-value">{day.seconds ? Math.max(1, Math.round(day.seconds / 60)) : 0}</span></span></div>
          <time dateTime={day.date}>{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</time>
        </li>)}
      </ol>
    </div>
    <p className="admin-usage-chart-note">Số trên cột là tổng số phút hoạt động.</p>
  </section>
}
