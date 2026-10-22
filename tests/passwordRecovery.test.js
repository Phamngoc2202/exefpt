import assert from 'node:assert/strict'
import test from 'node:test'
import { hasPasswordRecoveryCredentials, isPasswordRecoveryRedirect, passwordRecoveryRedirectUrl, urlWithoutPasswordRecovery } from '../src/lib/passwordRecovery.js'

test('liên kết đặt lại mật khẩu trở về đúng origin và không mang theo query cũ', () => {
  const location = new URL('https://exefpt.vercel.app/?share=abc#section')
  assert.equal(passwordRecoveryRedirectUrl(location), 'https://exefpt.vercel.app/?reset-password=1')
})

test('nhận diện liên kết khôi phục và xóa dấu khôi phục sau khi xử lý', () => {
  const location = new URL('http://localhost:5173/?reset-password=1&view=home#access_token=example')
  assert.equal(isPasswordRecoveryRedirect(location), true)
  assert.equal(hasPasswordRecoveryCredentials(location), true)
  assert.equal(urlWithoutPasswordRecovery(location), '/?view=home')
  assert.equal(isPasswordRecoveryRedirect(new URL('http://localhost:5173/')), false)
  assert.equal(hasPasswordRecoveryCredentials(new URL('http://localhost:5173/?reset-password=1')), false)
  assert.equal(hasPasswordRecoveryCredentials(new URL('http://localhost:5173/?reset-password=1&code=abc')), true)
  assert.equal(urlWithoutPasswordRecovery(new URL('http://localhost:5173/?reset-password=1&code=abc&view=home')), '/?view=home')
})
