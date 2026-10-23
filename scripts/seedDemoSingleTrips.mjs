import { randomInt } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { isVariedGmail } from './demoEmailStyle.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localDir = join(projectRoot, '.local')
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const planKey = args.includes('--plan=plus') ? 'plus' : 'single_trip'
const plan = planKey === 'plus'
  ? { key: 'plus', count: 4, amountVnd: 99000, credits: 20, label: 'Plus', file: 'demo-plus-4.json' }
  : { key: 'single_trip', count: 16, amountVnd: 20000, credits: 1, label: 'Single Trip', file: 'demo-single-trip-16.json' }
const selectionPath = join(localDir, plan.file)
const pageSize = 500

if (args.some((arg) => arg !== '--apply' && arg !== '--plan=plus')) {
  throw new Error('Chỉ hỗ trợ tùy chọn --apply.')
}

const normalizeEmail = (value) => value.toLowerCase().replaceAll('.', '')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const letters = (length) => Array.from({ length }, () => String.fromCharCode(97 + randomInt(26))).join('')
const digits = (length) => Array.from({ length }, () => randomInt(10)).join('')
const slug = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replaceAll('Đ', 'D').replaceAll('đ', 'd').toLowerCase().replace(/[^a-z]/g, '')

async function save(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

function makeEmail(fullName, style) {
  const parts = fullName.split(/\s+/).map(slug)
  const family = parts[0]
  const given = parts.at(-1)
  const middle = parts.slice(1, -1).join('') || 'minh'
  const initials = parts.map((part) => part[0]).join('')
  const nicknames = ['maylangthang', 'thichmua', 'motchutnang', 'langnghe', 'nhatkyxanh', 'duongve', 'ngayxua']
  const variants = [
    () => `${given}${family}${digits(2)}${letters(5)}`,
    () => `${family}.${given}${digits(4)}${letters(4)}`,
    () => `${middle}${given}.${letters(7)}`,
    () => `${nicknames[randomInt(nicknames.length)]}${digits(3)}${letters(5)}`,
    () => `${given}${randomInt(1995, 2006)}${letters(6)}`,
    () => `${initials}.${family}${digits(5)}${letters(4)}`,
    () => `${given}.${family}${letters(7)}`,
    () => `${family}${middle}${letters(6)}${digits(2)}`,
  ]
  return `${variants[style % variants.length]().slice(0, 30)}@gmail.com`
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1)
    ;[items[index], items[other]] = [items[other], items[index]]
  }
  return items
}

async function fetchAll(makeQuery) {
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await makeQuery().range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if ((data || []).length < pageSize) return rows
  }
}

async function readDemoUsers() {
  const files = (await readdir(localDir)).filter((file) => /^demo-users-\d+-2026-10-\d{2}\.json$/.test(file))
  const users = []
  const manifests = new Map()
  for (const file of files) {
    const manifest = JSON.parse(await readFile(join(localDir, file), 'utf8'))
    manifests.set(file, manifest)
    for (const user of manifest.users || []) {
      if (user.userId && user.email && user.fullName) users.push({ ...user, sourceFile: file })
    }
  }
  if (new Set(users.map((user) => user.userId)).size !== users.length) {
    throw new Error('Tài khoản demo bị trùng ID giữa các tệp trong .local.')
  }
  return { users, manifests }
}

function validateSelection(selection, manifests) {
  if (selection.version !== 1 || selection.plan !== plan.key || selection.amountVnd !== plan.amountVnd
    || selection.users?.length !== plan.count) throw new Error(`Danh sách phải có đúng ${plan.count} tài khoản ${plan.label}.`)
  if (new Set(selection.users.map((user) => user.userId)).size !== plan.count
    || new Set(selection.users.map((user) => normalizeEmail(user.desiredEmail))).size !== plan.count) {
    throw new Error('Danh sách demo có ID hoặc Gmail trùng.')
  }
  for (const user of selection.users) {
    if (!isVariedGmail(user.desiredEmail) || !/^demo-users-\d+-2026-10-\d{2}\.json$/.test(user.sourceFile)) {
      throw new Error('Email hoặc tên tệp demo không hợp lệ.')
    }
    const source = manifests.get(user.sourceFile)?.users?.find((entry) => entry.userId === user.userId)
    if (!source || source.fullName !== user.fullName
      || ![user.previousEmail, user.desiredEmail].includes(source.email)) {
      throw new Error(`Tài khoản trong ${user.sourceFile} đã thay đổi. Dừng để tránh ghi nhầm.`)
    }
  }
}

async function readOtherSelection() {
  const otherFile = plan.key === 'plus' ? 'demo-single-trip-16.json' : 'demo-plus-4.json'
  try {
    return JSON.parse(await readFile(join(localDir, otherFile), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return { users: [] }
    throw error
  }
}

async function prepareSelection(demoUsers, profiles, paidOrders, manifests, otherSelection) {
  const otherIds = new Set(otherSelection.users.map((user) => user.userId))
  const otherEmails = new Set(otherSelection.users.map((user) => normalizeEmail(user.desiredEmail)))
  try {
    const saved = JSON.parse(await readFile(selectionPath, 'utf8'))
    validateSelection(saved, manifests)
    if (saved.users.some((user) => otherIds.has(user.userId)
      || otherEmails.has(normalizeEmail(user.desiredEmail)))) {
      throw new Error('Hai danh sách gói mẫu bị trùng tài khoản hoặc Gmail.')
    }
    return saved
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const alreadyPaid = new Set(paidOrders.map((order) => order.user_id))
  const candidates = shuffle(demoUsers.filter((user) => {
    const profile = profileById.get(user.userId)
    return profile?.role === 'user' && profile.email?.toLowerCase() === user.email.toLowerCase()
      && !alreadyPaid.has(user.userId) && !otherIds.has(user.userId)
  }))
  if (candidates.length < plan.count) throw new Error(`Không đủ ${plan.count} tài khoản demo chưa có gói trả phí.`)

  const reserved = new Set([...profiles.map((profile) => profile.email), ...demoUsers.map((user) => user.email)]
    .filter(Boolean).map(normalizeEmail).concat([...otherEmails]))
  const chosen = candidates.slice(0, plan.count)
  const users = chosen.map((user, index) => {
    let desiredEmail
    do { desiredEmail = makeEmail(user.fullName, index) } while (!isVariedGmail(desiredEmail) || reserved.has(normalizeEmail(desiredEmail)))
    reserved.add(normalizeEmail(desiredEmail))
    return {
      userId: user.userId,
      sourceFile: user.sourceFile,
      fullName: user.fullName,
      previousEmail: user.email,
      desiredEmail,
      orderId: null,
      status: 'prepared',
    }
  })
  const selection = { version: 1, plan: plan.key, amountVnd: plan.amountVnd, users }
  validateSelection(selection, manifests)
  await save(selectionPath, selection)
  return selection
}

async function assertRpcInstalled(supabase) {
  const { error } = await supabase.rpc('grant_demo_purchase', {
    p_user_id: '00000000-0000-0000-0000-000000000000', p_expected_email: '', p_plan_key: plan.key,
  })
  if (error?.message !== 'demo_account_mismatch') {
    throw new Error(`Chưa sẵn sàng cấp gói mẫu. Hãy chạy supabase/demo_single_trip.sql trong SQL Editor. ${error?.message || ''}`)
  }
}

async function applySelection(supabase, selection, manifests, profiles, paidOrders) {
  await assertRpcInstalled(supabase)
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const paidByUser = new Map(paidOrders.map((order) => [order.user_id, order]))
  const selectedIds = new Set(selection.users.map((user) => user.userId))
  const occupied = new Set(profiles.filter((profile) => !selectedIds.has(profile.id))
    .map((profile) => profile.email).filter(Boolean).map(normalizeEmail))

  for (const user of selection.users) {
    const profile = profileById.get(user.userId)
    const existingOrder = paidByUser.get(user.userId)
    if (profile?.role !== 'user' || ![user.previousEmail, user.desiredEmail].includes(profile.email)
      || occupied.has(normalizeEmail(user.desiredEmail))
      || (existingOrder && existingOrder.receiver_va !== 'DEMO')) {
      throw new Error(`Tài khoản ${user.fullName} không còn khớp dữ liệu đã chuẩn bị.`)
    }
    const { data: authRecord, error: authError } = await supabase.auth.admin.getUserById(user.userId)
    if (authError || authRecord?.user?.user_metadata?.full_name !== user.fullName
      || ![user.previousEmail, user.desiredEmail].includes(authRecord?.user?.email)) {
      throw new Error(`Không xác minh được tài khoản demo ${user.fullName}.`)
    }
  }

  for (const [index, user] of selection.users.entries()) {
    const { data: current, error: readError } = await supabase.auth.admin.getUserById(user.userId)
    if (readError) throw readError
    if (current.user.email !== user.desiredEmail) {
      const { error } = await supabase.auth.admin.updateUserById(user.userId, {
        email: user.desiredEmail, email_confirm: true,
      })
      if (error) throw new Error(`Không đổi được Gmail của ${user.fullName}: ${error.message}`)
    }
    const { data: confirmed, error: confirmError } = await supabase.auth.admin.getUserById(user.userId)
    if (confirmError || confirmed?.user?.email !== user.desiredEmail || !confirmed.user.email_confirmed_at) {
      throw new Error(`Chưa xác nhận được Gmail mới của ${user.fullName}.`)
    }
    const { data: profile, error: profileError } = await supabase.from('app_users')
      .select('id,email').eq('id', user.userId).single()
    if (profileError || !profile || profile.email !== user.desiredEmail) {
      throw new Error(`Email hồ sơ của ${user.fullName} chưa đồng bộ từ Auth.`)
    }

    const source = manifests.get(user.sourceFile)
    const sourceUser = source.users.find((entry) => entry.userId === user.userId)
    sourceUser.previousEmail ||= sourceUser.email
    sourceUser.email = user.desiredEmail
    sourceUser.desiredEmail = user.desiredEmail
    sourceUser.emailStyle = 'varied'
    await save(join(localDir, user.sourceFile), source)
    user.status = 'email_updated'
    await save(selectionPath, selection)

    const { data: orderId, error: grantError } = await supabase.rpc('grant_demo_purchase', {
      p_user_id: user.userId, p_expected_email: user.desiredEmail, p_plan_key: plan.key,
    })
    if (grantError || !orderId) throw new Error(`Không cấp được gói mẫu cho ${user.fullName}: ${grantError?.message || 'thiếu ID đơn'}`)
    const { data: order, error: orderError } = await supabase.from('payment_orders')
      .select('id,user_id,plan_key,amount_vnd,credits,receiver_va,status,sepay_transaction_id')
      .eq('id', orderId).single()
    if (orderError || !order || order.user_id !== user.userId || order.plan_key !== plan.key
      || order.amount_vnd !== plan.amountVnd || order.credits !== plan.credits || order.receiver_va !== 'DEMO'
      || order.status !== 'paid' || order.sepay_transaction_id !== null) {
      throw new Error(`Đơn mẫu của ${user.fullName} không khớp.`)
    }
    user.orderId = orderId
    user.status = 'complete'
    await save(selectionPath, selection)
    console.log(`Đã xử lý ${index + 1}/${plan.count} tài khoản ${plan.label}.`)
    await sleep(150)
  }
}

async function main() {
  const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !adminKey) throw new Error('Thiếu Supabase URL hoặc secret key trong .env.local.')
  const supabase = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const [{ users: demoUsers, manifests }, profiles, paidOrders] = await Promise.all([
    readDemoUsers(),
    fetchAll(() => supabase.from('app_users').select('id,email,role').order('id')),
    fetchAll(() => supabase.from('payment_orders').select('user_id,receiver_va').eq('status', 'paid').order('id')),
  ])
  const otherSelection = await readOtherSelection()
  const selection = await prepareSelection(demoUsers, profiles, paidOrders, manifests, otherSelection)
  if (!apply) {
    console.log(`Đã chuẩn bị ${selection.users.length} tài khoản cho gói ${plan.label} mẫu: ${selectionPath}`)
    console.log('Xem lại danh sách, chạy supabase/demo_single_trip.sql, rồi chạy lệnh seed với --apply.')
    return
  }
  await applySelection(supabase, selection, manifests, profiles, paidOrders)
  console.log(`Hoàn tất ${plan.count} gói ${plan.label} mẫu. Giao dịch SePay và doanh thu thật không thay đổi.`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
