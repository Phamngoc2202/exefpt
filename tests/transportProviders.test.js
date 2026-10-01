import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTransportProviderLinks, toProviderSlug } from '../src/lib/transportProviders.js'

test('tên địa phương được chuyển thành đường dẫn nhà cung cấp', () => {
  assert.equal(toProviderSlug('Hải Phòng'), 'hai-phong')
  assert.equal(toProviderSlug('Ninh Bình'), 'ninh-binh')
})

test('tạo liên kết tìm vé theo tuyến, ngày và số người', () => {
  const providers = buildTransportProviderLinks({
    origin: 'Hải Phòng', destination: 'Ninh Bình', startDate: '2026-10-20', travelers: 2,
  })
  const twelveGo = providers.find((provider) => provider.name === '12Go')
  const vexere = providers.find((provider) => provider.name === 'VeXeRe')

  assert.match(twelveGo.url, /hai-phong\/ninh-binh/)
  assert.match(twelveGo.url, /date=2026-10-20/)
  assert.match(twelveGo.url, /people=2/)
  assert.equal(vexere.exactRoute, true)
})
