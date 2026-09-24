import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeTripQuota } from '../src/lib/tripQuota.js'

test('Tài khoản mới có một lượt tạo miễn phí', () => {
  assert.equal(summarizeTripQuota({ generations_used: 0, bonus_generations: 0 }).remaining, 1)
})

test('Sau lần tạo đầu tiên, lượt miễn phí đã hết', () => {
  assert.equal(summarizeTripQuota({ generations_used: 1, bonus_generations: 0 }).remaining, 0)
})

test('Lượt admin cấp thêm được cộng vào số lượt còn lại', () => {
  assert.equal(summarizeTripQuota({ generations_used: 1, bonus_generations: 3 }).remaining, 3)
  assert.equal(summarizeTripQuota({ generations_used: 0, bonus_generations: 2 }).remaining, 3)
})
