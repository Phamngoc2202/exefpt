import { supabase } from './supabase'

export async function getPaymentAvailability() {
  const { data, error } = await supabase.from('payment_settings')
    .select('enabled').eq('id', 1).maybeSingle()
  if (error || !data || typeof data.enabled !== 'boolean') {
    throw new Error('Không đọc được trạng thái thanh toán.')
  }
  return data.enabled
}
