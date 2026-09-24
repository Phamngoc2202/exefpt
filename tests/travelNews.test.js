import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTravelFeed } from '../api/travel-news.js'

test('chuyển RSS du lịch thành dữ liệu bài viết dùng được trên giao diện', () => {
  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <item>
          <title><![CDATA[Khám phá Hà Giang &amp; mùa hoa]]></title>
          <link>https://vnexpress.net/kham-pha-ha-giang.html</link>
          <description><![CDATA[<img src="https://i1-vnexpress.vnecdn.net/ha-giang.jpg">Một hành trình <b>đáng nhớ</b> ở miền Bắc.]]></description>
          <pubDate>Thu, 24 Sep 2026 08:00:00 +0700</pubDate>
        </item>
      </channel>
    </rss>`

  const articles = parseTravelFeed(feed)

  assert.equal(articles.length, 1)
  assert.equal(articles[0].title, 'Khám phá Hà Giang & mùa hoa')
  assert.equal(articles[0].url, 'https://vnexpress.net/kham-pha-ha-giang.html')
  assert.equal(articles[0].image, 'https://i1-vnexpress.vnecdn.net/ha-giang.jpg')
  assert.match(articles[0].description, /Một hành trình đáng nhớ ở miền Bắc/)
  assert.equal(articles[0].source, 'VnExpress Du lịch')
})

test('loại bỏ bài thiếu tiêu đề và vô hiệu hóa liên kết không an toàn', () => {
  const feed = `<rss><channel>
    <item><title></title><link>https://example.com/empty</link></item>
    <item><title>Bài hợp lệ</title><link>javascript:alert(1)</link></item>
  </channel></rss>`

  const articles = parseTravelFeed(feed)

  assert.equal(articles.length, 1)
  assert.equal(articles[0].url, 'https://vnexpress.net/du-lich')
})
