import { randomInt } from 'node:crypto'

const firstParts = ['b0y', 'g1rl', 'babii', 'kute', 'xjnh', 'bu0n', 'm0ngm0', 'thjen', 'nh0k', 'l0nely', 'c0gai', 'anh2k', 'emiu']
const secondParts = ['kute', 'xjnh', 'nhoem', 'thjchmua', 'h4ppy', 'l0nely', 'banhbe0', 's0ck', 'c4ndy', 'b4by']

export function randomTeenGmail() {
  const first = firstParts[randomInt(firstParts.length)]
  const second = secondParts[randomInt(secondParts.length)]
  const digits = String(randomInt(100_000_000)).padStart(8, '0')
  return `${first}.${second}.2k${randomInt(10)}.${digits}@gmail.com`
}

export function isTeenGmail(email) {
  if (typeof email !== 'string') return false
  const [local, domain, extra] = email.toLowerCase().split('@')
  return !extra && domain === 'gmail.com' && local.length >= 6 && local.length <= 30
    && /^[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(local) && /\.2k\d\./.test(local)
}

export function randomShortGmail(fullName) {
  const base = fullName.split(/\s+/).slice(-2).join('')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replaceAll('Đ', 'D').replaceAll('đ', 'd')
    .toLowerCase().replace(/[^a-z]/g, '').slice(0, 14)
  const letters = Array.from({ length: 6 }, () => String.fromCharCode(97 + randomInt(26))).join('')
  return `${base}${letters}${randomInt(100, 1000)}@gmail.com`
}

export function isShortGmail(email) {
  return typeof email === 'string' && /^[a-z0-9]{6,30}@gmail\.com$/.test(email)
}

export function randomHumanGmail(fullName) {
  const [family, middle, given] = fullName.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replaceAll('Đ', 'D').replaceAll('đ', 'd')
    .toLowerCase().split(/\s+/)
  const bases = [`${middle}${given}`, `${family}${given}`, `${given}.${family}`, `${family}.${given}`, `${given}${middle}`]
  return `${bases[randomInt(bases.length)]}${randomInt(100_000, 1_000_000)}@gmail.com`
}

export function isHumanGmail(email) {
  if (typeof email !== 'string') return false
  const [local, domain, extra] = email.toLowerCase().split('@')
  return !extra && domain === 'gmail.com' && local.length >= 6 && local.length <= 30
    && /^[a-z0-9]+(?:\.[a-z0-9]+)*\d{6}$/.test(local) && !local.includes('tripgenie')
}
