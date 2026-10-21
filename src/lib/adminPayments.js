import { supabase } from './supabase'

export async function getAdminUserPage(filters) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.')

  const response = await fetch('/api/admin-payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Không tải được danh sách tài khoản và thanh toán.')
  return payload
}
