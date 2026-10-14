import test from 'node:test'
import assert from 'node:assert/strict'
import { dailySignupCounts, signupWindowStart, vietnamDateKey } from '../src/lib/adminAnalytics.js'

test('nhóm tài khoản theo ngày Việt Nam ở ranh giới nửa đêm UTC', () => {
  assert.equal(vietnamDateKey('2026-10-13T16:59:59Z'), '2026-10-13')
  assert.equal(vietnamDateKey('2026-10-13T17:00:00Z'), '2026-10-14')
  assert.equal(signupWindowStart(3, '2026-10-14T12:00:00+07:00'), '2026-10-11T17:00:00.000Z')
})

test('biểu đồ giữ ngày không có người mới và bỏ ngày ngoài khoảng', () => {
  const users = [
    { created_at: '2026-10-13T16:59:59Z' },
    { created_at: '2026-10-13T17:00:00Z' },
    { created_at: '2026-10-14T16:59:59Z' },
    { created_at: '2026-10-14T17:00:00Z' },
  ]
  assert.deepEqual(dailySignupCounts(users, 3, '2026-10-14T12:00:00+07:00'), [
    { key: '2026-10-12', label: '12/10', count: 0 },
    { key: '2026-10-13', label: '13/10', count: 1 },
    { key: '2026-10-14', label: '14/10', count: 2 },
  ])
})
