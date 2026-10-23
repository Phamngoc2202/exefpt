import assert from 'node:assert/strict'
import test from 'node:test'
import { signupFeedback } from '../src/lib/signupFeedback.js'

test('báo Gmail đã sử dụng khi Supabase trả lỗi trùng tài khoản', () => {
  assert.match(signupFeedback({ data: null, error: { code: 'user_already_exists', message: 'User already registered' } }), /Gmail này đã được sử dụng/)
})

test('nhận diện người dùng giả do Supabase trả về cho email đã đăng ký', () => {
  assert.match(signupFeedback({ data: { user: { identities: [] }, session: null }, error: null }), /Gmail này đã được sử dụng/)
})

test('không báo đăng ký thành công khi Supabase không xác định được tài khoản mới hay cũ', () => {
  assert.match(signupFeedback({ data: { user: {}, session: null }, error: null }), /Nếu Gmail chưa có tài khoản/)
})

test('hướng dẫn xác nhận Gmail khi Supabase tạo tài khoản mới', () => {
  assert.match(signupFeedback({ data: { user: { identities: [{}] }, session: null }, error: null }), /Đã gửi email xác nhận/)
})

test('chỉ hiện thời hạn xác nhận cho đăng ký mới khi tự dọn đang bật', () => {
  const result = { data: { user: { identities: [{}] }, session: null }, error: null }
  assert.match(signupFeedback(result, { enabled: true, retention_minutes: 5 }), /Liên kết xác nhận có hiệu lực khoảng 5 phút/)
  assert.doesNotMatch(signupFeedback(result, { enabled: false, retention_minutes: 5 }), /5 phút/)
  assert.doesNotMatch(signupFeedback({ data: { user: { identities: [] }, session: null }, error: null }, { enabled: true, retention_minutes: 5 }), /5 phút/)
})

test('giữ thông báo lỗi khác và cho phép đăng ký có phiên đăng nhập', () => {
  assert.equal(signupFeedback({ data: null, error: { message: 'Password too short' } }), 'Password too short')
  assert.equal(signupFeedback({ data: { user: { identities: [{}] }, session: {} }, error: null }), null)
})
