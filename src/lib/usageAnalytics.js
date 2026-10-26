export function formatUsageDuration(value) {
  const seconds = Math.max(0, Number(value) || 0)
  if (seconds === 0) return '0 phút'
  if (seconds < 60) return '< 1 phút'

  const totalMinutes = Math.floor(seconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days} ngày${hours ? ` ${hours} giờ` : ''}`
  if (hours > 0) return `${hours} giờ${minutes ? ` ${minutes} phút` : ''}`
  return `${minutes} phút`
}

export function averageSessionSeconds(totalSeconds, totalSessions) {
  const sessions = Math.max(0, Number(totalSessions) || 0)
  return sessions ? Math.round(Math.max(0, Number(totalSeconds) || 0) / sessions) : 0
}
