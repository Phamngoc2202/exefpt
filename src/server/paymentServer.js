import { randomBytes, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const MAX_BODY_BYTES = 8_192

export function paymentEnvironment(overrides = {}) {
  const runtime = process.env
  return {
    supabaseUrl: overrides.supabaseUrl ?? runtime.SUPABASE_URL ?? runtime.VITE_SUPABASE_URL,
    publishableKey: overrides.publishableKey ?? runtime.VITE_SUPABASE_PUBLISHABLE_KEY,
    secretKey: overrides.secretKey ?? runtime.SUPABASE_SECRET_KEY ?? runtime.SUPABASE_SERVICE_ROLE_KEY,
    receiverVa: overrides.receiverVa ?? runtime.SEPAY_RECEIVER_VA,
    receiverName: overrides.receiverName ?? runtime.SEPAY_RECEIVER_NAME ?? '',
    webhookKey: overrides.webhookKey ?? runtime.SEPAY_WEBHOOK_API_KEY,
    mode: overrides.mode ?? runtime.SEPAY_PAYMENT_MODE,
  }
}

export function validPaymentEnvironment(env, requireWebhookKey = false) {
  return Boolean(env.supabaseUrl && env.publishableKey && env.secretKey
    && /^[A-Z0-9]{6,19}$/.test(env.receiverVa || '')
    && ['test', 'live'].includes(env.mode)
    && (!requireWebhookKey || (env.webhookKey && env.webhookKey.length >= 24)))
}

export function serviceClient(env) {
  return createClient(env.supabaseUrl, env.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export function authClient(env) {
  return createClient(env.supabaseUrl, env.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

export async function readJsonBody(request) {
  const headerLength = Number(request.headers['content-length'])
  if (Number.isFinite(headerLength) && headerLength > MAX_BODY_BYTES) throw new Error('body_too_large')
  if (request.body && typeof request.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(request.body)) > MAX_BODY_BYTES) throw new Error('body_too_large')
    return request.body
  }
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body) > MAX_BODY_BYTES) throw new Error('body_too_large')
    return JSON.parse(request.body)
  }
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error('body_too_large')
  }
  return body ? JSON.parse(body) : {}
}

export function bearerToken(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || '')
  return match?.[1] || ''
}

export function secureEqual(actual, expected) {
  const actualBytes = Buffer.from(actual || '')
  const expectedBytes = Buffer.from(expected || '')
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

export function newPaymentCode() {
  return `TG${randomBytes(5).toString('hex').toUpperCase()}`
}

export function paymentCodeFromWebhook(payload) {
  const code = String(payload.code || '').trim().toUpperCase()
  if (/^TG[0-9A-F]{10}$/.test(code)) return code
  const content = String(payload.content || '').toUpperCase()
  return content.match(/(?:^|[^A-Z0-9])(TG[0-9A-F]{10})(?![A-Z0-9])/)?.[1] || null
}

export function qrImageUrl(receiverVa, amountVnd, code) {
  const url = new URL('https://vietqr.app/img')
  url.searchParams.set('acc', receiverVa)
  url.searchParams.set('bank', 'BIDV')
  url.searchParams.set('amount', String(amountVnd))
  url.searchParams.set('des', code)
  url.searchParams.set('template', 'compact')
  return url.toString()
}
