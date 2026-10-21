import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { isHumanGmail, isTeenGmail, randomHumanGmail, randomTeenGmail } from './demoEmailStyle.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const dateOption = args.find((arg) => arg.startsWith('--date='))
const targetDate = dateOption?.slice('--date='.length) || '2026-10-13'
const batches = {
  '2026-10-12': { count: 21 },
  '2026-10-13': { count: 15, label: 'teencode', style: 'teen2k', generate: randomTeenGmail, validate: isTeenGmail },
  '2026-10-14': { count: 20, label: 'tên người dùng', style: 'human', generate: randomHumanGmail, validate: isHumanGmail },
}
const batch = batches[targetDate]
const manifestPath = resolve(projectRoot, '.local', `demo-users-${batch?.count}-${targetDate}.json`)
const apply = args.includes('--apply')
if (!batch?.generate || args.some((arg) => arg !== '--apply' && arg !== dateOption) || args.filter((arg) => arg.startsWith('--date=')).length > 1) {
  throw new Error('Chỉ hỗ trợ đổi email cho đợt 13/10 hoặc 14/10/2026, kèm tùy chọn --apply.')
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const gmailIdentity = (email) => email.toLowerCase().replaceAll('.', '')

function vietnamDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

async function save(manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
}

async function loadAndPrepare() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const otherUsers = []
  for (const [date, config] of Object.entries(batches)) {
    if (date === targetDate) continue
    const other = JSON.parse(await readFile(resolve(projectRoot, '.local', `demo-users-${config.count}-${date}.json`), 'utf8'))
    if (other.users?.length !== config.count) throw new Error(`Danh sách ngày ${date} không hợp lệ.`)
    otherUsers.push(...other.users)
  }
  if (manifest.users?.length !== batch.count || manifest.users.some((user) => !user.userId || !user.password || (targetDate === '2026-10-13' && vietnamDate(user.joinedAt) !== targetDate))) {
    throw new Error(`Danh sách ${batch.count} tài khoản ngày ${targetDate} chưa đầy đủ hoặc chưa tạo trên Supabase.`)
  }

  const reserved = new Set([...manifest.users, ...otherUsers].flatMap((user) => [user.email, user.desiredEmail].filter(Boolean).map(gmailIdentity)))
  for (const user of manifest.users) {
    if (!user.previousEmail) user.previousEmail = user.email
    if (!user.desiredEmail) {
      let candidate
      do { candidate = batch.generate(user.fullName) } while (reserved.has(gmailIdentity(candidate)))
      user.desiredEmail = candidate
    }
    if (!batch.validate(user.desiredEmail)) throw new Error(`Email mới không hợp lệ cho ${user.fullName}.`)
    reserved.add(gmailIdentity(user.desiredEmail))
  }
  if (new Set(manifest.users.map((user) => gmailIdentity(user.desiredEmail))).size !== batch.count) {
    throw new Error('Danh sách email mới bị trùng theo quy tắc dấu chấm của Gmail.')
  }
  await save(manifest)
  return manifest
}

async function updateEmailWithRetry(supabase, user) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.auth.admin.updateUserById(user.userId, { email: user.desiredEmail, email_confirm: true })
    if (!error) return
    if (![429, 500, 502, 503, 504].includes(Number(error.status)) || attempt === 4) {
      throw new Error(`Không đổi được email của ${user.fullName}: ${error.message}`)
    }
    await sleep(1000 * 2 ** attempt)
  }
}

async function main() {
  const manifest = await loadAndPrepare()
  if (!apply) {
    console.log(`Đã chuẩn bị ${batch.count} email kiểu ${batch.label}: ${manifestPath}`)
    console.log(`Chạy npm run rename:demo-emails -- ${dateOption ? `${dateOption} ` : ''}--apply để cập nhật Supabase Auth.`)
    return
  }

  const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !adminKey) throw new Error('Thiếu Supabase URL hoặc secret key trong .env.local.')
  const supabase = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const ids = manifest.users.map((user) => user.userId)
  const { data: profiles, error: profilesError } = await supabase.from('app_users').select('id,email,created_at').in('id', ids)
  if (profilesError || profiles?.length !== batch.count || profiles.some((profile) => vietnamDate(profile.created_at) !== targetDate)) {
    throw new Error(`Hồ sơ ngày ${targetDate} không khớp: ${profilesError?.message || 'thiếu tài khoản'}`)
  }
  const { data: collisions, error: collisionError } = await supabase.from('app_users').select('id,email').in('email', manifest.users.map((user) => user.desiredEmail))
  if (collisionError || collisions?.some((user) => !ids.includes(user.id))) {
    throw new Error(`Email mới đã được sử dụng: ${collisionError?.message || 'trùng tài khoản khác'}`)
  }

  for (const user of manifest.users) {
    const { data: current, error: currentError } = await supabase.auth.admin.getUserById(user.userId)
    if (currentError || ![user.previousEmail, user.desiredEmail].includes(current?.user?.email) || current.user.user_metadata?.full_name !== user.fullName) {
      throw new Error(`Tài khoản ${user.fullName} không khớp ID/email đã lưu. Dừng cập nhật.`)
    }
  }

  let renamed = 0
  for (const [index, user] of manifest.users.entries()) {
    const { data: current, error: currentError } = await supabase.auth.admin.getUserById(user.userId)
    if (currentError) throw new Error(`Không đọc được tài khoản ${user.fullName}: ${currentError.message}`)
    if (current.user.email !== user.desiredEmail) {
      await updateEmailWithRetry(supabase, user)
      renamed += 1
    }
    const { data: confirmed, error: confirmError } = await supabase.auth.admin.getUserById(user.userId)
    if (confirmError || confirmed?.user?.email !== user.desiredEmail || !confirmed.user.email_confirmed_at) {
      throw new Error(`Email của ${user.fullName} chưa được cập nhật và xác nhận trong Auth.`)
    }

    const { data: profile, error: profileError } = await supabase.from('app_users').select('id,email,created_at').eq('id', user.userId).single()
    if (profileError || !profile || vietnamDate(profile.created_at) !== targetDate) {
      throw new Error(`Hồ sơ ngày tham gia của ${user.fullName} không khớp.`)
    }
    if (profile.email !== user.desiredEmail) {
      const { error: syncError } = await supabase.from('app_users').update({ email: user.desiredEmail }).eq('id', user.userId)
      if (syncError) throw new Error(`Không đồng bộ được email hồ sơ của ${user.fullName}: ${syncError.message}`)
    }
    user.email = user.desiredEmail
    user.emailStyle = batch.style
    await save(manifest)
    if ((index + 1) % 5 === 0 || index + 1 === manifest.users.length) console.log(`Đã xử lý ${index + 1}/${batch.count} · đổi mới ${renamed}`)
    await sleep(150)
  }
  console.log(`Hoàn tất. Email và mật khẩu hiện tại: ${manifestPath}`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
