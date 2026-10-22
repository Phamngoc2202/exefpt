export function isAllowedSignupEmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(String(email || '').trim())
}

export function gmailSignupEmail(localPart) {
  const name = String(localPart || '').trim()
  const email = `${name}@gmail.com`
  return isAllowedSignupEmail(email) ? email : null
}
