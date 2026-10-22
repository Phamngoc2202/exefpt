export function signupFeedback({ data, error }) {
  const duplicateError = error?.code === 'user_already_exists'
    || /user already (registered|exists)/i.test(error?.message || '')
  const duplicateIdentity = Array.isArray(data?.user?.identities)
    && data.user.identities.length === 0

  if (duplicateError || duplicateIdentity) {
    return 'Gmail này đã được sử dụng. Hãy đăng nhập hoặc dùng Gmail khác.'
  }

  if (error) return error.message

  if (!data?.session) {
    if (Array.isArray(data?.user?.identities) && data.user.identities.length > 0) {
      return 'Đã gửi email xác nhận đăng ký. Hãy kiểm tra Gmail của bạn.'
    }
    return 'Nếu Gmail chưa có tài khoản, hãy kiểm tra email để xác nhận. Nếu đã đăng ký, hãy đăng nhập.'
  }

  return null
}
