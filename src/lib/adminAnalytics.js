const DAY_MS = 24 * 60 * 60 * 1000
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000
const vietnamDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function vietnamDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(vietnamDateFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function signupWindowStart(days, now = new Date()) {
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) - (days - 1) * DAY_MS - VIETNAM_OFFSET_MS).toISOString()
}

export function dailySignupCounts(users, days, now = new Date()) {
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number)
  const today = Date.UTC(year, month - 1, day)
  const series = Array.from({ length: days }, (_, index) => {
    const key = new Date(today - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10)
    return { key, label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, count: 0 }
  })
  const byKey = new Map(series.map((item) => [item.key, item]))

  for (const user of users) {
    const dayEntry = byKey.get(vietnamDateKey(user.created_at))
    if (dayEntry) dayEntry.count += 1
  }

  return series
}
