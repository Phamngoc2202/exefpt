import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedSignupEmail } from '../src/lib/signupEmail.js'

test('chỉ cho đăng ký bằng địa chỉ @gmail.com', () => {
  assert.equal(isAllowedSignupEmail('ban@gmail.com'), true)
  assert.equal(isAllowedSignupEmail(' ban+demo@GMAIL.COM '), true)
  for (const email of ['ban@yahoo.com', 'ban@googlemail.com', 'ban@gmail.com.evil', 'ban@@gmail.com', 'ban@gmail.com extra', '']) {
    assert.equal(isAllowedSignupEmail(email), false, email)
  }
})
