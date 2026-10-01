export const departurePoints = [
  { name: 'Hà Nội', coordinates: { lat: 21.0278, lng: 105.8342 } },
  { name: 'Hải Phòng', coordinates: { lat: 20.8449, lng: 106.6881 } },
  { name: 'Hạ Long', coordinates: { lat: 20.9712, lng: 107.0448 } },
  { name: 'Ninh Bình', coordinates: { lat: 20.2506, lng: 105.9745 } },
  { name: 'Bắc Ninh', coordinates: { lat: 21.1861, lng: 106.0763 } },
  { name: 'Nam Định', coordinates: { lat: 20.4388, lng: 106.1621 } },
  { name: 'Thái Nguyên', coordinates: { lat: 21.5942, lng: 105.8482 } },
  { name: 'Việt Trì', coordinates: { lat: 21.3015, lng: 105.4303 } },
  { name: 'Sa Pa', coordinates: { lat: 22.3364, lng: 103.8438 } },
  { name: 'Hà Giang', coordinates: { lat: 22.8026, lng: 104.9784 } },
]

export const departurePointNames = departurePoints.map((point) => point.name)

export function findDeparturePoint(name) {
  return departurePoints.find((point) => point.name === name)
}
