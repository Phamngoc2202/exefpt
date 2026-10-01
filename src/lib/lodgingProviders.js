export function buildLodgingProviderLinks({ destination, startDate, endDate, travelers = 1 }) {
  const guests = Math.max(1, Number(travelers) || 1)
  const rooms = Math.max(1, Math.ceil(guests / 2))
  const common = {
    checkin: startDate || '',
    checkout: endDate || '',
    adults: String(guests),
    rooms: String(rooms),
  }

  const booking = new URLSearchParams({
    ss: `${destination}, Việt Nam`,
    checkin: common.checkin,
    checkout: common.checkout,
    group_adults: common.adults,
    no_rooms: common.rooms,
    group_children: '0',
  })
  const agoda = new URLSearchParams({
    textToSearch: `${destination}, Việt Nam`,
    checkIn: common.checkin,
    checkOut: common.checkout,
    rooms: common.rooms,
    adults: common.adults,
    children: '0',
  })

  return {
    rooms,
    providers: [
      { name: 'Booking.com', url: `https://www.booking.com/searchresults.vi.html?${booking}`, action: 'Tìm trên Booking.com' },
      { name: 'Agoda', url: `https://www.agoda.com/vi-vn/search?${agoda}`, action: 'Tìm trên Agoda' },
    ],
  }
}
