const recoveryParam = 'reset-password'

export function isPasswordRecoveryRedirect(location) {
  return new URLSearchParams(location.search).get(recoveryParam) === '1'
}

export function hasPasswordRecoveryCredentials(location) {
  if (!isPasswordRecoveryRedirect(location)) return false
  const query = new URLSearchParams(location.search)
  const fragment = new URLSearchParams(location.hash.slice(1))
  return query.has('code') || fragment.has('access_token')
}

export function passwordRecoveryRedirectUrl(location) {
  const url = new URL(location.pathname, location.origin)
  url.searchParams.set(recoveryParam, '1')
  return url.toString()
}

export function urlWithoutPasswordRecovery(location) {
  const url = new URL(location.href)
  url.searchParams.delete(recoveryParam)
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  url.hash = ''
  return `${url.pathname}${url.search}`
}
