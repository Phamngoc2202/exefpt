import assert from 'node:assert/strict'
import test from 'node:test'
import { describeWeatherCode, normalizeWeatherPayload } from '../src/lib/weather.js'

test('mã thời tiết Open-Meteo được chuyển thành mô tả tiếng Việt', () => {
  assert.equal(describeWeatherCode(0).label, 'Trời quang')
  assert.equal(describeWeatherCode(63).label, 'Có mưa')
  assert.equal(describeWeatherCode(95).label, 'Có dông')
})

test('dữ liệu dự báo được ghép đúng theo ngày', () => {
  const result = normalizeWeatherPayload({ daily: {
    time: ['2026-10-02'],
    weather_code: [61],
    temperature_2m_max: [28.4],
    temperature_2m_min: [21.2],
    precipitation_probability_max: [70],
    wind_speed_10m_max: [12.6],
  } })

  assert.deepEqual(result['2026-10-02'], {
    date: '2026-10-02', label: 'Có mưa', icon: '🌧️', min: 21, max: 28, rain: 70, wind: 13,
  })
})
