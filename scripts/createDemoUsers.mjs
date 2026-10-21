import { randomBytes, randomInt } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { isHumanGmail, isShortGmail, isTeenGmail, randomHumanGmail, randomShortGmail, randomTeenGmail } from './demoEmailStyle.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dateOption = args.find((arg) => arg.startsWith('--date='))
const targetDate = dateOption?.slice('--date='.length) || '2026-10-14'
const batches = {
  '2026-10-12': { count: 21, emailStyle: 'short' },
  '2026-10-13': { count: 15, emailStyle: 'teen' },
  '2026-10-14': { count: 20, emailStyle: 'human' },
  '2026-10-15': { count: 19, emailStyle: 'human' },
}
const batch = batches[targetDate]
const totalUsers = batch?.count
const historicalBatch = targetDate !== '2026-10-14'
const manifestPath = resolve(projectRoot, '.local', `demo-users-${totalUsers}-${targetDate}.json`)
const batchSize = 500
const apply = args.includes('--apply')
const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô']
const middleNames = ['Minh', 'Ngọc', 'Thị', 'Thanh', 'Gia', 'Quang', 'Đức', 'Hải', 'Khánh', 'Phương', 'Anh', 'Thuỳ']
const givenNames = ['An', 'Anh', 'Bảo', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hân', 'Hiếu', 'Hoa', 'Huy', 'Khôi', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Ngân', 'Nhi', 'Phong', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Trâm', 'Tú', 'Vy']

if (!totalUsers || args.some((arg) => arg !== '--apply' && arg !== dateOption) || args.filter((arg) => arg.startsWith('--date=')).length > 1) {
  throw new Error('Chỉ hỗ trợ các đợt tài khoản demo đã cấu hình từ ngày 12/10 đến 15/10/2026, kèm tùy chọn --apply.')
}

const sleep = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms))

async function saveManifest(manifest) {
  await mkdir(dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function validateManifest(manifest) {
  if (manifest.users?.length !== totalUsers) throw new Error(`Danh sách demo phải có đúng ${totalUsers} tài khoản.`)
  const emails = manifest.users.map((user) => user.email.toLowerCase())
  const names = manifest.users.map((user) => user.fullName)
  if (new Set(emails).size !== totalUsers || new Set(names).size !== totalUsers || manifest.users.some((user) => !user.password || !user.email?.endsWith('@gmail.com') || !user.fullName || (historicalBatch && localDate(user.joinedAt) !== targetDate) || (batch.emailStyle === 'short' && !isShortGmail(user.email)) || (batch.emailStyle === 'teen' && !isTeenGmail(user.email)) || (batch.emailStyle === 'human' && !isHumanGmail(user.email)))) {
    throw new Error('Danh sách demo có email trùng hoặc thông tin đăng nhập không hợp lệ.')
  }
}

function localDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function assertCreationDate() {
  if (!historicalBatch && localDate() !== targetDate) throw new Error(`Chỉ tạo đợt 20 tài khoản vào ngày 14/10/2026 (giờ Việt Nam). Hôm nay là ${localDate()}.`)
  if (historicalBatch && localDate() < targetDate) throw new Error('Không thể tạo hồ sơ demo cho ngày trong tương lai.')
}

function randomName() {
  return `${familyNames[randomInt(familyNames.length)]} ${middleNames[randomInt(middleNames.length)]} ${givenNames[randomInt(givenNames.length)]}`
}

async function loadOrPrepareManifest() {
  const saved = await readJsonIfPresent(manifestPath)
  if (saved) {
    validateManifest(saved)
    return saved
  }

  const users = []
  const names = new Set()
  const reservedEmails = new Set()
  for (const [date, config] of Object.entries(batches)) {
    if (date === targetDate) continue
    const existingBatch = (await readJsonIfPresent(resolve(projectRoot, '.local', `demo-users-${config.count}-${date}.json`)))?.users || []
    for (const user of existingBatch) {
      names.add(user.fullName)
      reservedEmails.add(user.email.toLowerCase().replaceAll('.', ''))
    }
  }
  while (users.length < totalUsers) {
    const fullName = randomName()
    if (names.has(fullName)) continue
    names.add(fullName)
    let email
    do {
      email = batch.emailStyle === 'short' ? randomShortGmail(fullName)
        : batch.emailStyle === 'teen' ? randomTeenGmail()
          : randomHumanGmail(fullName)
    } while (reservedEmails.has(email.toLowerCase().replaceAll('.', '')))
    reservedEmails.add(email.toLowerCase().replaceAll('.', ''))
    users.push({
      email,
      password: `TG!${randomBytes(18).toString('base64url')}a9`,
      fullName,
      ...(historicalBatch ? { joinedAt: `${targetDate}T${String(randomInt(8, 21)).padStart(2, '0')}:${String(randomInt(60)).padStart(2, '0')}:00+07:00` } : {}),
      userId: null,
      status: 'pending',
    })
  }
  const manifest = { version: 1, users }
  validateManifest(manifest)
  await saveManifest(manifest)
  return manifest
}

async function createWithRetry(supabase, user) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName, ...(historicalBatch ? { demo_joined_at: user.joinedAt } : {}) },
    })
    if (!result.error && result.data?.user?.id) return result.data.user
    if (!result.error) throw new Error(`Supabase không trả về ID cho ${user.email}.`)
    if (![429, 500, 502, 503, 504].includes(Number(result.error.status)) || attempt === 4) {
      throw new Error(`Không tạo được ${user.email}: ${result.error.message}`)
    }
    await sleep(1000 * 2 ** attempt)
  }
}

async function loadExistingDemoUsers(supabase) {
  const existing = new Map()
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase.from('app_users')
      .select('id,email')
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1)
    if (error) throw new Error(`Không đọc được public.app_users: ${error.message}`)
    for (const user of data || []) existing.set(user.email.toLowerCase(), user.id)
    if ((data || []).length < batchSize) return existing
  }
}

async function syncHistoricalProfile(supabase, user) {
  if (!historicalBatch) return
  const { data, error } = await supabase.from('app_users')
    .update({ created_at: user.joinedAt })
    .eq('id', user.userId)
    .select('id,created_at')
    .single()
  if (error || !data || localDate(data.created_at) !== targetDate) {
    throw new Error(`Không cập nhật được ngày tham gia ${targetDate} cho ${user.email}: ${error?.message || 'dữ liệu không khớp'}`)
  }
}

async function main() {
  const manifest = await loadOrPrepareManifest()
  if (!apply) {
    console.log(`Đã chuẩn bị ${manifest.users.length} cặp email/mật khẩu: ${manifestPath}`)
    console.log(`Kiểm tra danh sách, sau đó chạy: npm run seed:demo-users -- ${historicalBatch ? `--date=${targetDate} ` : ''}--apply`)
    return
  }

  const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !adminKey) throw new Error('Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY trong .env.local.')
  assertCreationDate()

  const supabase = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error: accessError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (accessError) throw new Error(`Khóa bí mật không truy cập được Auth Admin API: ${accessError.message}`)

  const existing = await loadExistingDemoUsers(supabase)
  let created = 0
  let skipped = 0
  for (const [index, user] of manifest.users.entries()) {
    const existingId = existing.get(user.email.toLowerCase())
    if (existingId) {
      if (user.userId && user.userId !== existingId) throw new Error(`ID của ${user.email} không khớp. Dừng để tránh ghi đè tài khoản.`)
      if (historicalBatch && !user.userId) {
        const { data: authRecord, error: authError } = await supabase.auth.admin.getUserById(existingId)
        if (authError || authRecord?.user?.user_metadata?.demo_joined_at !== user.joinedAt || authRecord.user.user_metadata.full_name !== user.fullName) {
          throw new Error(`Email ${user.email} đã tồn tại nhưng không xác minh được thuộc đợt demo ${targetDate}.`)
        }
      }
      user.userId = existingId
      user.status = 'existing'
      skipped += 1
    } else {
      if (user.userId) throw new Error(`${user.email} đã có ID trong tệp nhưng không còn trong public.app_users.`)
      assertCreationDate()
      const authUser = await createWithRetry(supabase, user)
      user.userId = authUser.id
      user.status = 'created'
      await saveManifest(manifest)
      const { data: profile, error: profileError } = await supabase.from('app_users').select('id').eq('id', authUser.id).maybeSingle()
      if (profileError || !profile) {
        throw new Error(`Đã tạo ${user.email} trong Auth nhưng chưa có hồ sơ app_users. Kiểm tra trigger trong supabase/admin.sql rồi chạy lại.`)
      }
      existing.set(user.email.toLowerCase(), authUser.id)
      created += 1
    }
    await syncHistoricalProfile(supabase, user)
    await saveManifest(manifest)
    if ((index + 1) % 10 === 0 || index + 1 === totalUsers) {
      console.log(`Đã xử lý ${index + 1}/${totalUsers} · tạo mới ${created} · đã có ${skipped}`)
    }
    if (!existingId) await sleep(150)
  }
  console.log(`Hoàn tất. Thông tin đăng nhập: ${manifestPath}`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
