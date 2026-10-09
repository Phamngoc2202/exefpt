const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeShareToken(value) {
  const token = String(value || '').trim()
  return UUID_PATTERN.test(token) ? token.toLowerCase() : ''
}

export function shareTokenFromSearch(search = '') {
  return normalizeShareToken(new URLSearchParams(search).get('share'))
}

export function buildTripShareUrl(token, currentUrl) {
  const safeToken = normalizeShareToken(token)
  if (!safeToken) return ''
  const url = new URL(currentUrl)
  url.search = ''
  url.hash = ''
  url.searchParams.set('share', safeToken)
  return url.toString()
}
