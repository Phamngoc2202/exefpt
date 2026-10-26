import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SAMPLE_INTERVAL_MS = 5_000
const REPORT_INTERVAL_SECONDS = 30
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart']

function createSessionId() {
  return globalThis.crypto?.randomUUID?.()
}

export default function UsageTracker({ userId }) {
  useEffect(() => {
    if (!userId) return undefined

    const usageSessionId = createSessionId()
    if (!usageSessionId) return undefined

    let accumulatedSeconds = 0
    let lastTickAt = Date.now()
    let lastInteractionAt = Date.now()
    let reportInFlight = false
    let disposed = false

    const markInteraction = () => { lastInteractionAt = Date.now() }

    const sample = () => {
      const now = Date.now()
      const elapsedSeconds = Math.min((now - lastTickAt) / 1000, SAMPLE_INTERVAL_MS / 1000 + 1)
      if (document.visibilityState === 'visible' && now - lastInteractionAt <= IDLE_TIMEOUT_MS) {
        accumulatedSeconds += Math.max(0, elapsedSeconds)
      }
      lastTickAt = now
    }

    const report = async () => {
      if (reportInFlight) return
      const seconds = Math.min(60, Math.floor(accumulatedSeconds))
      if (seconds < 1) return

      accumulatedSeconds -= seconds
      reportInFlight = true
      const { error } = await supabase.rpc('record_user_activity', {
        p_session_id: usageSessionId,
        p_active_seconds: seconds,
      })
      reportInFlight = false

      if (error && !disposed) {
        accumulatedSeconds = Math.min(60, accumulatedSeconds + seconds)
      }
    }

    const tick = () => {
      sample()
      if (accumulatedSeconds >= REPORT_INTERVAL_SECONDS) void report()
    }

    const handleVisibilityChange = () => {
      sample()
      if (document.visibilityState === 'visible') markInteraction()
      else void report()
    }

    const handlePageHide = () => {
      sample()
      void report()
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markInteraction, { passive: true })
    }
    window.addEventListener('focus', markInteraction)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const timer = window.setInterval(tick, SAMPLE_INTERVAL_MS)

    return () => {
      sample()
      disposed = true
      window.clearInterval(timer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, markInteraction)
      window.removeEventListener('focus', markInteraction)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void report()
    }
  }, [userId])

  return null
}
