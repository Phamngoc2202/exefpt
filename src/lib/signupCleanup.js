import { supabase } from './supabase'

export const MIN_SIGNUP_CLEANUP_MINUTES = 1
export const MAX_SIGNUP_CLEANUP_MINUTES = 60

export async function getSignupCleanupSettings() {
  const { data, error } = await supabase.from('signup_cleanup_settings')
    .select('enabled,retention_minutes').eq('id', 1).single()
  if (error) throw error
  return data
}
