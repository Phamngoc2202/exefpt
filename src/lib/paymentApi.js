import { supabase } from './supabase'

async function paymentRequest(path, options = {}) {
  const { data: authData } = await supabase.auth.getSession()
  const token = authData.session?.access_token
  if (!token) throw new Error('Vui lòng đăng nhập để thanh toán.')

  let response
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch {
    throw new Error('Không kết nối được máy chủ thanh toán. Vui lòng thử lại.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'Thanh toán hiện chưa sẵn sàng. Vui lòng thử lại sau.')
    error.code = payload.code
    throw error
  }
  return payload.order
}

export function createPaymentOrder(planKey) {
  return paymentRequest('/api/payment-orders', {
    method: 'POST',
    body: JSON.stringify({ planKey }),
  })
}

export function getPaymentOrder(id) {
  return paymentRequest(`/api/payment-orders?id=${encodeURIComponent(id)}`)
}
