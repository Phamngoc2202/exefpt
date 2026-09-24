const FEED_URL = 'https://vnexpress.net/rss/du-lich.rss'
const CACHE_TTL = 30 * 60 * 1000

let cache = { expiresAt: 0, payload: null }

function decodeEntities(value = '') {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' }
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return decodeEntities(match?.[1] || '').trim()
}

function plainText(value = '') {
  return decodeEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function imageFrom(block, description) {
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1]
  const media = block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i)?.[1]
  const inline = description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  const image = decodeEntities(enclosure || media || inline || '')
  return /^https?:\/\//i.test(image) ? image : null
}

export function parseTravelFeed(xml) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .slice(0, 6)
    .map(([, item], index) => {
      const rawDescription = tagValue(item, 'description')
      const link = tagValue(item, 'link')
      return {
        id: link || `vnexpress-${index}`,
        title: plainText(tagValue(item, 'title')),
        description: plainText(rawDescription),
        url: /^https?:\/\//i.test(link) ? link : 'https://vnexpress.net/du-lich',
        image: imageFrom(item, rawDescription),
        publishedAt: tagValue(item, 'pubDate') || null,
        source: 'VnExpress Du lịch',
      }
    })
    .filter((article) => article.title)
}

function sendJson(response, status, payload, cacheStatus) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
  response.setHeader('X-Travel-News-Cache', cacheStatus)
  response.end(JSON.stringify(payload))
}

export default async function travelNewsHandler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { articles: [], error: 'Phương thức không được hỗ trợ.' }, 'BYPASS')
    return
  }

  const now = Date.now()
  if (cache.payload && cache.expiresAt > now) {
    sendJson(response, 200, cache.payload, 'HIT')
    return
  }

  try {
    const feedResponse = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'TripGenie/1.0 (+https://github.com/Phamngoc2202/exefpt)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!feedResponse.ok) throw new Error(`RSS responded with ${feedResponse.status}`)
    const articles = parseTravelFeed(await feedResponse.text())
    if (!articles.length) throw new Error('RSS did not contain any articles')
    const payload = { articles, source: 'VnExpress Du lịch', fetchedAt: new Date().toISOString() }
    cache = { payload, expiresAt: now + CACHE_TTL }
    sendJson(response, 200, payload, 'MISS')
  } catch (error) {
    if (cache.payload) {
      sendJson(response, 200, { ...cache.payload, stale: true }, 'STALE')
      return
    }
    sendJson(response, 502, { articles: [], error: 'Không thể tải tin du lịch lúc này.', detail: error.message }, 'ERROR')
  }
}
