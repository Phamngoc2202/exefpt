import assert from 'node:assert/strict'
import test from 'node:test'
import { gmailSignupEmail, isAllowedSignupEmail } from '../src/lib/signupEmail.js'

test('chỉ cho đăng ký bằng địa chỉ @gmail.com', () => {
  assert.equal(isAllowedSignupEmail('ban@gmail.com'), true)
  assert.equal(isAllowedSignupEmail(' ban+demo@GMAIL.COM '), true)
  for (const email of ['ban@yahoo.com', 'ban@googlemail.com', 'ban@gmail.com.evil', 'ban@@gmail.com', 'ban@gmail.com extra', '']) {
    assert.equal(isAllowedSignupEmail(email), false, email)
  }
})

test('ghép tên người dùng với đuôi Gmail cố định', () => {
  assert.equal(gmailSignupEmail('ngoc.anh'), 'ngoc.anh@gmail.com')
  assert.equal(gmailSignupEmail('  ngoc+demo  '), 'ngoc+demo@gmail.com')
  assert.equal(gmailSignupEmail('ngoc@yahoo.com'), null)
  assert.equal(gmailSignupEmail(''), null)
})
