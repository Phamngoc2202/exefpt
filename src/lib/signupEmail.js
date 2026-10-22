export function isAllowedSignupEmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(String(email || '').trim())
}
