import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTripShareUrl, normalizeShareToken, shareTokenFromSearch } from '../src/lib/tripSharing.js'

const token = 'f12b4b9e-57ad-4d8c-84d6-f6fb9c3476bf'

test('chỉ chấp nhận token chia sẻ đúng định dạng UUID', () => {
  assert.equal(normalizeShareToken(token.toUpperCase()), token)
  assert.equal(normalizeShareToken('not-a-token'), '')
  assert.equal(normalizeShareToken(''), '')
})

test('đọc token chia sẻ từ query string', () => {
  assert.equal(shareTokenFromSearch(`?share=${token}&from=zalo`), token)
  assert.equal(shareTokenFromSearch('?share=invalid'), '')
})

test('tạo liên kết chỉ giữ query chia sẻ và bỏ hash cũ', () => {
  assert.equal(
    buildTripShareUrl(token, 'https://exefpt.vercel.app/?old=value#section'),
    `https://exefpt.vercel.app/?share=${token}`,
  )
})
