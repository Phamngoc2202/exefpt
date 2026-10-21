import { randomBytes, randomInt } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { isHumanGmail, randomHumanGmail } from './demoEmailStyle.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const planPath = resolve(root, '.local', 'demo-users-2026-10-02-to-11.json')
const dates = Array.from({ length: 10 }, (_, index) => `2026-10-${String(index + 2).padStart(2, '0')}`)
const apply = process.argv.includes('--apply')
const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô']
const middleNames = ['Minh', 'Ngọc', 'Thị', 'Thanh', 'Gia', 'Quang', 'Đức', 'Hải', 'Khánh', 'Phương', 'Anh', 'Thuỳ']
const givenNames = ['An', 'Anh', 'Bảo', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hân', 'Hiếu', 'Hoa', 'Huy', 'Khôi', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Ngân', 'Nhi', 'Phong', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Trâm', 'Tú', 'Vy']

if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Chỉ hỗ trợ tùy chọn --apply.')

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const gmailIdentity = (email) => email.toLowerCase().replaceAll('.', '')
const dayPath = (day) => resolve(root, '.local', `demo-users-${day.count}-${day.date}.json`)

function vietnamDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function save(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

function validatePlan(plan) {
  if (plan.days?.length !== dates.length || plan.days.some((day, index) => day.date !== dates[index] || !Number.isInteger(day.count) || day.count < 2 || day.count > 5)) {
    throw new Error('Kế hoạch phải có đủ ngày 02–11/10, mỗi ngày từ 2 đến 5 tài khoản.')
  }
}

async function loadPlan() {
  const saved = await readJsonIfPresent(planPath)
  if (saved) {
    validatePlan(saved)
    return saved
  }
  const plan = { version: 1, days: dates.map((date) => ({ date, count: randomInt(2, 6) })) }
  await save(planPath, plan)
  return plan
}

function validateDay(day, manifest) {
  if (manifest.date !== day.date || manifest.users?.length !== day.count || manifest.users.some((user) => !user.fullName || !user.password || !isHumanGmail(user.email) || vietnamDate(user.joinedAt) !== day.date)) {
    throw new Error(`Danh sách tài khoản ngày ${day.date} không hợp lệ.`)
  }
}

function randomName() {
  return `${familyNames[randomInt(familyNames.length)]} ${middleNames[randomInt(middleNames.length)]} ${givenNames[randomInt(givenNames.length)]}`
}

function randomJoinedAt(date) {
  return `${date}T${String(randomInt(8, 22)).padStart(2, '0')}:${String(randomInt(60)).padStart(2, '0')}:${String(randomInt(60)).padStart(2, '0')}+07:00`
}

async function prepareDays(plan) {
  const names = new Set()
  const emails = new Set()
  for (const [count, date] of [[21, '2026-10-12'], [15, '2026-10-13'], [20, '2026-10-14']]) {
    const batch = await readJsonIfPresent(resolve(root, '.local', `demo-users-${count}-${date}.json`))
    if (batch?.users?.length !== count) throw new Error(`Thiếu danh sách đã tạo ngày ${date}.`)
    for (const user of batch.users) {
      names.add(user.fullName)
      emails.add(gmailIdentity(user.email))
    }
  }

  const manifests = new Map()
  for (const day of plan.days) {
    const saved = await readJsonIfPresent(dayPath(day))
    if (!saved) continue
    validateDay(day, saved)
    manifests.set(day.date, saved)
    for (const user of saved.users) {
      if (names.has(user.fullName) || emails.has(gmailIdentity(user.email))) throw new Error(`Trùng tên hoặc email ngày ${day.date}.`)
      names.add(user.fullName)
      emails.add(gmailIdentity(user.email))
    }
  }

  for (const day of plan.days) {
    if (manifests.has(day.date)) continue
    const users = []
    while (users.length < day.count) {
      const fullName = randomName()
      if (names.has(fullName)) continue
      names.add(fullName)
      let email
      do { email = randomHumanGmail(fullName) } while (emails.has(gmailIdentity(email)))
      emails.add(gmailIdentity(email))
      users.push({
        email,
        password: `TG!${randomBytes(18).toString('base64url')}a9`,
        fullName,
        joinedAt: randomJoinedAt(day.date),
        userId: null,
        status: 'pending',
      })
    }
    const manifest = { version: 1, date: day.date, users }
    validateDay(day, manifest)
    await save(dayPath(day), manifest)
    manifests.set(day.date, manifest)
  }
  return manifests
}

async function createWithRetry(supabase, user) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName, demo_joined_at: user.joinedAt, demo_batch: '2026-10-02-to-11' },
    })
    if (!error && data?.user?.id) return data.user
    if (!error) throw new Error(`Supabase không trả về ID cho ${user.email}.`)
    if (![429, 500, 502, 503, 504].includes(Number(error.status)) || attempt === 4) {
      throw new Error(`Không tạo được ${user.email}: ${error.message}`)
    }
    await sleep(1000 * 2 ** attempt)
  }
}

async function syncProfile(supabase, user, date) {
  const { data: current, error: currentError } = await supabase.from('app_users').select('id,email,created_at').eq('id', user.userId).single()
  if (currentError || !current || current.email !== user.email) throw new Error(`Không tìm thấy hồ sơ của ${user.email}.`)
  if (new Date(current.created_at).getTime() !== new Date(user.joinedAt).getTime()) {
    const { data, error } = await supabase.from('app_users').update({ created_at: user.joinedAt }).eq('id', user.userId).select('id,created_at').single()
    if (error || !data || vietnamDate(data.created_at) !== date) throw new Error(`Không cập nhật được ngày tham gia của ${user.email}: ${error?.message || 'ngày không khớp'}`)
  }
}

async function applyPlan(plan, manifests) {
  const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !adminKey) throw new Error('Thiếu Supabase URL hoặc secret key trong .env.local.')
  if (vietnamDate(new Date()) < dates.at(-1)) throw new Error('Không thể đặt ngày tham gia demo trong tương lai.')
  const supabase = createClient(projectUrl, adminKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  const { error: accessError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (accessError) throw new Error(`Không truy cập được Auth Admin API: ${accessError.message}`)

  const users = plan.days.flatMap((day) => manifests.get(day.date).users)
  const { data: found, error: profilesError } = await supabase.from('app_users').select('id,email').in('email', users.map((user) => user.email))
  if (profilesError) throw new Error(`Không đọc được app_users: ${profilesError.message}`)
  const existing = new Map(found.map((user) => [user.email.toLowerCase(), user.id]))

  let totalCreated = 0
  for (const day of plan.days) {
    const manifest = manifests.get(day.date)
    let createdToday = 0
    for (const user of manifest.users) {
      const existingId = existing.get(user.email.toLowerCase())
      if (existingId) {
        if (user.userId && user.userId !== existingId) throw new Error(`ID của ${user.email} không khớp.`)
        if (!user.userId) {
          const { data, error } = await supabase.auth.admin.getUserById(existingId)
          if (error || data?.user?.user_metadata?.demo_joined_at !== user.joinedAt || data.user.user_metadata.full_name !== user.fullName) {
            throw new Error(`Email ${user.email} đã thuộc tài khoản khác.`)
          }
        }
        user.userId = existingId
        user.status = 'existing'
      } else {
        if (user.userId) throw new Error(`${user.email} đã có ID trong tệp nhưng không còn trong app_users.`)
        const authUser = await createWithRetry(supabase, user)
        user.userId = authUser.id
        user.status = 'created'
        await save(dayPath(day), manifest)
        existing.set(user.email.toLowerCase(), authUser.id)
        createdToday += 1
        totalCreated += 1
      }
      await syncProfile(supabase, user, day.date)
      await save(dayPath(day), manifest)
      await sleep(150)
    }
    console.log(`${day.date}: ${day.count} tài khoản · tạo mới ${createdToday}`)
  }
  console.log(`Hoàn tất: tạo mới ${totalCreated} tài khoản. Kế hoạch: ${planPath}`)
}

async function main() {
  const plan = await loadPlan()
  const manifests = await prepareDays(plan)
  const total = plan.days.reduce((sum, day) => sum + day.count, 0)
  if (!apply) {
    console.log(`Đã chuẩn bị ${total} tài khoản cho 10 ngày: ${planPath}`)
    console.log(plan.days.map((day) => `${day.date.slice(8)}/10: ${day.count}`).join(' · '))
    console.log('Chạy npm run seed:early-demo-users -- --apply để tạo thật.')
    return
  }
  await applyPlan(plan, manifests)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
