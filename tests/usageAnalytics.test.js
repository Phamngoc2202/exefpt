import assert from 'node:assert/strict'
import test from 'node:test'
import { averageSessionSeconds, formatUsageDuration } from '../src/lib/usageAnalytics.js'

test('định dạng thời gian sử dụng ngắn gọn cho admin', () => {
  assert.equal(formatUsageDuration(0), '0 phút')
  assert.equal(formatUsageDuration(35), '< 1 phút')
  assert.equal(formatUsageDuration(3900), '1 giờ 5 phút')
  assert.equal(formatUsageDuration(93_600), '1 ngày 2 giờ')
})

test('tính thời lượng trung bình mỗi phiên và xử lý dữ liệu trống', () => {
  assert.equal(averageSessionSeconds(3600, 4), 900)
  assert.equal(averageSessionSeconds(3600, 0), 0)
})
