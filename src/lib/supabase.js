import { createClient } from '@supabase/supabase-js'
import { hasPasswordRecoveryCredentials } from './passwordRecovery'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY trong .env.local')
}

// Capture the callback before createClient consumes and removes its tokens from the URL.
export const passwordRecoveryCallback = typeof window !== 'undefined'
  && hasPasswordRecoveryCredentials(window.location)

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
