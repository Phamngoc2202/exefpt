const verifiedVexereRoutes = {
  'Hải Phòng|Ninh Bình': 'https://vexere.com/vi-VN/ve-xe-khach-tu-hai-phong-di-ninh-binh-127t1421.html',
}

export function toProviderSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildTransportProviderLinks({ origin, destination, startDate, travelers = 1 }) {
  const routeKey = `${origin}|${destination}`
  const date = encodeURIComponent(startDate || '')
  const people = Math.max(1, Number(travelers) || 1)
  const routePath = `${toProviderSlug(origin)}/${toProviderSlug(destination)}`

  return [
    {
      name: 'VeXeRe',
      description: 'So sánh nhà xe, giờ chạy, điểm đón trả và tình trạng chỗ.',
      url: verifiedVexereRoutes[routeKey] || 'https://vexere.com/vi-VN/',
      exactRoute: Boolean(verifiedVexereRoutes[routeKey]),
      action: verifiedVexereRoutes[routeKey] ? 'Xem tuyến này' : 'Tìm trên VeXeRe',
    },
    {
      name: '12Go',
      description: 'Tìm xe khách, minivan và các phương án di chuyển kết hợp.',
      url: `https://12go.asia/en/travel/${routePath}?date=${date}&people=${people}`,
      exactRoute: true,
      action: 'Xem tuyến này',
    },
  ]
}
