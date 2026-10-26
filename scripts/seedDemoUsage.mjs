import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localDir = join(projectRoot, '.local')
const apply = process.argv.slice(2).includes('--apply')
const invalidArgs = process.argv.slice(2).filter((arg) => arg !== '--apply')
const PAGE_SIZE = 500
const BATCH_SIZE = 150
const HISTORY_DAYS = 30
const SEED_VERSION = 'tripgenie-demo-usage-v1'
const vietnamFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
})

if (invalidArgs.length) throw new Error('Chỉ hỗ trợ tùy chọn --apply.')

function vietnamDateKey(value = new Date()) {
  const parts = Object.fromEntries(vietnamFormatter.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function dateKeys(days, now = new Date()) {
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number)
  const today = Date.UTC(year, month - 1, day)
  return Array.from({ length: days }, (_, index) => new Date(today - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10))
}

function seededRandom(seed) {
  const hash = createHash('sha256').update(seed).digest()
  let state = hash.readUInt32LE(0)
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296
  }
}

function randomBetween(random, minimum, maximum) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum
}

function deterministicUuid(value) {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function laterTimestamp(left, right) {
  if (!left) return right
  if (!right) return left
  return new Date(left) > new Date(right) ? left : right
}

async function fetchAll(makeQuery) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if ((data || []).length < PAGE_SIZE) return rows
  }
}

async function readLocalUserIds() {
  const files = (await readdir(localDir)).filter((file) => file.startsWith('demo-users') && file.endsWith('.json'))
  const ids = new Set()
  let preparedOnly = 0
  for (const file of files) {
    const manifest = JSON.parse(await readFile(join(localDir, file), 'utf8'))
    for (const user of manifest.users || []) {
      if (user.userId) ids.add(user.userId)
      else preparedOnly += 1
    }
  }
  return { ids, preparedOnly }
}

function buildSessions(profile, paid, availableDates, now = new Date()) {
  const joinedDate = vietnamDateKey(profile.created_at)
  const eligibleDates = availableDates.filter((date) => date >= joinedDate)
  const random = seededRandom(`${SEED_VERSION}:${profile.id}:${paid ? 'paid' : 'local'}`)
  const activeChance = paid ? 0.54 : 0.24
  const sessions = []

  for (const date of eligibleDates) {
    if (random() > activeChance) continue
    const sessionCount = paid ? randomBetween(random, 1, 3) : randomBetween(random, 1, 2)
    const targetMinutes = paid ? randomBetween(random, 28, 105) : randomBetween(random, 7, 46)
    let remainingSeconds = targetMinutes * 60

    for (let index = 0; index < sessionCount; index += 1) {
      const sessionsLeft = sessionCount - index
      const minimum = Math.min(remainingSeconds, 4 * 60)
      const maximum = Math.max(minimum, remainingSeconds - (sessionsLeft - 1) * 4 * 60)
      const activeSeconds = index === sessionCount - 1
        ? remainingSeconds
        : randomBetween(random, minimum, maximum)
      remainingSeconds -= activeSeconds

      let hour = randomBetween(random, 8, 21)
      const minute = randomBetween(random, 0, 59)
      if (date === vietnamDateKey(now)) {
        const currentHour = Number(new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23',
        }).format(now))
        hour = Math.min(hour, Math.max(0, currentHour - 1))
      }
      const startedAt = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`)
      const lastActiveAt = new Date(startedAt.getTime() + activeSeconds * 1000).toISOString()
      sessions.push({
        id: deterministicUuid(`${SEED_VERSION}:${profile.id}:${date}:${index}`),
        user_id: profile.id,
        started_at: startedAt.toISOString(),
        last_active_at: lastActiveAt,
        last_reported_at: lastActiveAt,
        active_seconds: activeSeconds,
        activityDate: date,
      })
    }
  }

  if (!sessions.length && eligibleDates.length) {
    const date = eligibleDates.at(-1)
    const activeSeconds = (paid ? 35 : 12) * 60
    const startedAt = new Date(`${date}T10:00:00+07:00`)
    const lastActiveAt = new Date(startedAt.getTime() + activeSeconds * 1000).toISOString()
    sessions.push({
      id: deterministicUuid(`${SEED_VERSION}:${profile.id}:${date}:fallback`),
      user_id: profile.id,
      started_at: startedAt.toISOString(),
      last_active_at: lastActiveAt,
      last_reported_at: lastActiveAt,
      active_seconds: activeSeconds,
      activityDate: date,
    })
  }
  return sessions
}

async function insertNewSessions(supabase, sessions) {
  const newIds = new Set()
  for (let offset = 0; offset < sessions.length; offset += BATCH_SIZE) {
    const batch = sessions.slice(offset, offset + BATCH_SIZE)
      .map(({ activityDate: _activityDate, ...session }) => session)
    const { data, error } = await supabase.from('user_usage_sessions')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(`Không tạo được phiên sử dụng mẫu: ${error.message}`)
    for (const row of data || []) newIds.add(row.id)
  }
  return sessions.filter((session) => newIds.has(session.id))
}

async function updateAggregates(supabase, insertedSessions, existingDaily, existingTotals) {
  if (!insertedSessions.length) return
  const dailyByKey = new Map(existingDaily.map((row) => [`${row.user_id}:${row.activity_date}`, { ...row }]))
  const totalsByUser = new Map(existingTotals.map((row) => [row.user_id, { ...row }]))

  for (const session of insertedSessions) {
    const dailyKey = `${session.user_id}:${session.activityDate}`
    const daily = dailyByKey.get(dailyKey) || {
      user_id: session.user_id, activity_date: session.activityDate, active_seconds: 0, last_active_at: null,
    }
    daily.active_seconds = Number(daily.active_seconds) + session.active_seconds
    daily.last_active_at = laterTimestamp(daily.last_active_at, session.last_active_at)
    dailyByKey.set(dailyKey, daily)

    const total = totalsByUser.get(session.user_id) || {
      user_id: session.user_id, total_active_seconds: 0, total_sessions: 0,
      first_tracked_at: session.started_at, last_active_at: null,
    }
    total.total_active_seconds = Number(total.total_active_seconds) + session.active_seconds
    total.total_sessions = Number(total.total_sessions) + 1
    total.first_tracked_at = total.first_tracked_at && new Date(total.first_tracked_at) < new Date(session.started_at)
      ? total.first_tracked_at : session.started_at
    total.last_active_at = laterTimestamp(total.last_active_at, session.last_active_at)
    totalsByUser.set(session.user_id, total)
  }

  const changedUsers = new Set(insertedSessions.map((session) => session.user_id))
  const changedDailyKeys = new Set(insertedSessions.map((session) => `${session.user_id}:${session.activityDate}`))
  const dailyRows = [...dailyByKey.entries()].filter(([key]) => changedDailyKeys.has(key)).map(([, row]) => row)
  const totalRows = [...totalsByUser.entries()].filter(([userId]) => changedUsers.has(userId)).map(([, row]) => row)

  for (let offset = 0; offset < dailyRows.length; offset += BATCH_SIZE) {
    const { error } = await supabase.from('user_usage_daily').upsert(dailyRows.slice(offset, offset + BATCH_SIZE), {
      onConflict: 'user_id,activity_date',
    })
    if (error) throw new Error(`Không cập nhật được thời gian theo ngày: ${error.message}`)
  }
  for (let offset = 0; offset < totalRows.length; offset += BATCH_SIZE) {
    const { error } = await supabase.from('user_usage_totals').upsert(totalRows.slice(offset, offset + BATCH_SIZE), {
      onConflict: 'user_id',
    })
    if (error) throw new Error(`Không cập nhật được tổng thời gian: ${error.message}`)
  }
}

async function main() {
  const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !adminKey) throw new Error('Thiếu Supabase URL hoặc secret key trong .env.local.')

  const supabase = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const [{ ids: localIds, preparedOnly }, profiles, paidOrders, existingDaily, existingTotals] = await Promise.all([
    readLocalUserIds(),
    fetchAll(() => supabase.from('app_users')
      .select('id,email,created_at,email_confirmed_at').not('email_confirmed_at', 'is', null).order('id')),
    fetchAll(() => supabase.from('payment_orders').select('user_id').eq('status', 'paid').order('id')),
    fetchAll(() => supabase.from('user_usage_daily').select('user_id,activity_date,active_seconds,last_active_at').order('user_id')),
    fetchAll(() => supabase.from('user_usage_totals')
      .select('user_id,total_active_seconds,total_sessions,first_tracked_at,last_active_at').order('user_id')),
  ])

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const paidIds = new Set(paidOrders.map((order) => order.user_id))
  const targetIds = new Set([...localIds, ...paidIds])
  const targets = [...targetIds].map((id) => profileById.get(id)).filter(Boolean)
  const availableDates = dateKeys(HISTORY_DAYS)
  const sessions = targets.flatMap((profile) => buildSessions(profile, paidIds.has(profile.id), availableDates))
  const totalHours = sessions.reduce((sum, session) => sum + session.active_seconds, 0) / 3600
  const paidTargets = targets.filter((profile) => paidIds.has(profile.id)).length

  console.log(`Tài khoản mục tiêu: ${targets.length} (${paidTargets} đã trả phí, ${localIds.size} có trong .local).`)
  console.log(`Dữ liệu chuẩn bị: ${sessions.length} phiên, khoảng ${totalHours.toFixed(1)} giờ trong ${HISTORY_DAYS} ngày.`)
  if (preparedOnly) console.log(`Bỏ qua ${preparedOnly} tài khoản trong .local chưa có userId trên Supabase.`)

  if (!apply) {
    console.log('Đây là bước xem trước. Chạy npm run seed:demo-usage -- --apply để ghi vào Supabase.')
    return
  }

  const insertedSessions = await insertNewSessions(supabase, sessions)
  await updateAggregates(supabase, insertedSessions, existingDaily, existingTotals)
  console.log(`Hoàn tất: thêm ${insertedSessions.length} phiên mới. Chạy lại sẽ không cộng trùng dữ liệu.`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
