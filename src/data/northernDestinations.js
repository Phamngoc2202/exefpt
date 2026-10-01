// Giá dưới đây chỉ là mức ước tính để lập kế hoạch, không phải giá vé/đặt chỗ hiện hành.
// Điểm tham quan tham khảo từ cổng thông tin Du lịch Việt Nam; người dùng có thể sửa từng khoản.
const place = (title, costPerPerson, tags, suggestedDay, note = '', searchName = title) => ({
  title, costPerPerson, tags, suggestedDay, note, searchName, type: 'place',
})

export const northernDestinations = [
  {
    city: 'Hà Nội', emoji: '🏮', meta: 'Phố cổ · Văn hóa · Ẩm thực', minDays: 1,
    coordinates: { lat: 21.0278, lng: 105.8342 },
    transportPerPerson: 0, localPerPersonPerDay: 80000, arrivalTime: '09:00',
    guideUrl: 'https://vietnam.travel/vi/places-to-go/northern-vietnam/ha-noi',
    color: 'linear-gradient(135deg, #b85d3d, #e3ac68)',
    activities: [
      place('Dạo quanh hồ Hoàn Kiếm', 0, ['Chụp ảnh', 'Văn hóa'], 1, 'Tản bộ quanh hồ và khu phố trung tâm.'),
      place('Khám phá phố cổ Hà Nội', 0, ['Văn hóa', 'Ẩm thực'], 1, 'Khám phá các tuyến phố nghề truyền thống.'),
      { ...place('Tham quan Di tích Nhà tù Hỏa Lò', 0, ['Văn hóa', 'Chụp ảnh'], 1, 'Mở cửa tham khảo 08:00–17:00 hằng ngày; kiểm tra giá vé và lịch hoạt động trước khi đi.', 'Nhà tù Hỏa Lò'), aliases: ['Nhà tù Hỏa Lò', 'Hỏa Lò', 'Di tích Hỏa Lò'], coordinates: { lat: 21.0254222, lng: 105.8465093 } },
      { ...place('Tham quan Nhà thờ Lớn Hà Nội', 0, ['Văn hóa', 'Chụp ảnh'], 1, 'Tham quan khu vực Nhà thờ Lớn; kiểm tra giờ mở cửa nếu muốn vào bên trong.', 'Nhà thờ Lớn'), aliases: ['Nhà thờ Lớn', 'Nhà thờ Lớn Hà Nội', 'Nhà thờ chính tòa Thánh Giuse'], coordinates: { lat: 21.0286483, lng: 105.8488566 } },
      place('Văn Miếu – Quốc Tử Giám', 70000, ['Văn hóa', 'Chụp ảnh'], 2, 'Chi phí tham quan ước tính mỗi người.'),
      place('Hoàng thành Thăng Long', 100000, ['Văn hóa'], 2, 'Dành thời gian tìm hiểu lịch sử Hà Nội.'),
      { ...place('Dạo hồ Tây và chùa Trấn Quốc', 0, ['Thiên nhiên', 'Chụp ảnh'], 3, '', 'Chùa Trấn Quốc'), coordinates: { lat: 21.0478, lng: 105.8368 } },
      place('Bảo tàng Dân tộc học', 60000, ['Văn hóa'], 3),
      place('Tham quan làng gốm Bát Tràng', 120000, ['Mua sắm', 'Văn hóa'], 4, 'Có thể phát sinh chi phí làm gốm và mua sắm.'),
      place('Ngắm phố đi bộ và chợ Đồng Xuân', 0, ['Mua sắm', 'Ẩm thực'], 4),
      place('Trải nghiệm cà phê phố cổ', 80000, ['Ẩm thực', 'Chụp ảnh'], 5),
      place('Khám phá các phòng tranh địa phương', 50000, ['Văn hóa', 'Chụp ảnh'], 5),
    ],
  },
  {
    city: 'Hạ Long', emoji: '⛵', meta: 'Vịnh biển · Du thuyền · Hang động', minDays: 1,
    coordinates: { lat: 20.9712, lng: 107.0448 },
    transportPerPerson: 500000, localPerPersonPerDay: 80000, arrivalTime: '10:30',
    guideUrl: 'https://vietnam.travel/vi/places-to-go/northern-vietnam/ha-long',
    color: 'linear-gradient(135deg, #0e6673, #68b7ad)',
    activities: [
      place('Dạo biển Bãi Cháy', 0, ['Biển', 'Chụp ảnh'], 1),
      place('Ngắm cảnh cầu Bãi Cháy', 0, ['Chụp ảnh'], 1),
      { ...place('Tour tham quan Vịnh Hạ Long', 650000, ['Biển', 'Thiên nhiên'], 2, 'Giá tour chỉ là ước tính; kiểm tra dịch vụ đi kèm.'), exclusiveWith: 'Khám phá hang động trên vịnh' },
      { ...place('Khám phá hang động trên vịnh', 180000, ['Thiên nhiên', 'Chụp ảnh'], 2, 'Ước tính nếu đi riêng; nhiều tour đã gồm điểm này.'), exclusiveWith: 'Tour tham quan Vịnh Hạ Long' },
      place('Chèo kayak', 180000, ['Biển', 'Thiên nhiên'], 3),
      place('Bảo tàng Quảng Ninh', 100000, ['Văn hóa'], 3),
      place('Khám phá làng chài nổi', 200000, ['Văn hóa', 'Biển'], 4),
      place('Dạo chợ đêm Hạ Long', 0, ['Mua sắm', 'Ẩm thực'], 4),
      place('Ngắm hoàng hôn bên bờ vịnh', 0, ['Chụp ảnh', 'Thiên nhiên'], 5),
      place('Khám phá đảo Tuần Châu', 150000, ['Biển', 'Chụp ảnh'], 5),
    ],
  },
  {
    city: 'Ninh Bình', emoji: '🚣', meta: 'Tràng An · Núi đá vôi · Cố đô', minDays: 1,
    coordinates: { lat: 20.2506, lng: 105.9745 },
    transportPerPerson: 300000, localPerPersonPerDay: 70000, arrivalTime: '10:00',
    guideUrl: 'https://vietnam.travel/vi/places-to-go/northern-vietnam/ninh-binh',
    color: 'linear-gradient(135deg, #477a52, #a4b877)',
    activities: [
      place('Dạo quanh Tam Cốc', 0, ['Thiên nhiên', 'Chụp ảnh'], 1, '', 'Tam Cốc'),
      place('Tham quan cố đô Hoa Lư', 50000, ['Văn hóa'], 1, '', 'Cố đô Hoa Lư'),
      { ...place('Đi thuyền Tràng An', 300000, ['Thiên nhiên', 'Chụp ảnh'], 2, 'Ước tính theo người; kiểm tra giá vé trước chuyến đi.', 'Khu du lịch sinh thái Tràng An'), coordinates: { lat: 20.2526855, lng: 105.9180767 } },
      { ...place('Leo núi Hang Múa', 120000, ['Thiên nhiên', 'Chụp ảnh'], 2, '', 'Hang Múa'), coordinates: { lat: 20.2317, lng: 105.9419 } },
      place('Tham quan chùa Bái Đính', 100000, ['Văn hóa'], 3, 'Có thể phát sinh chi phí xe điện.', 'Chùa Bái Đính'),
      place('Đi thuyền ở Vân Long', 120000, ['Thiên nhiên'], 3, '', 'Khu bảo tồn thiên nhiên Vân Long'),
      { ...place('Đạp xe quanh làng quê', 80000, ['Thiên nhiên', 'Chụp ảnh'], 4, 'Gợi ý cung đường làng quê quanh Tam Cốc.', 'Tam Cốc'), coordinates: { lat: 20.2176747, lng: 105.9294811 } },
      place('Khám phá khu vực Thung Nham', 150000, ['Thiên nhiên'], 4, '', 'Khu du lịch sinh thái Thung Nham'),
      place('Dạo phố cổ Hoa Lư', 0, ['Văn hóa', 'Ẩm thực'], 5, '', 'Phố cổ Hoa Lư'),
      place('Ghé thăm làng nghề địa phương', 80000, ['Văn hóa', 'Mua sắm'], 5, 'Gợi ý làng nghề đá Ninh Vân; kiểm tra lịch đón khách trước khi đi.', 'Làng nghề đá Ninh Vân'),
    ],
  },
  {
    city: 'Sa Pa', emoji: '⛰️', meta: 'Ruộng bậc thang · Trekking · Bản làng', minDays: 2,
    coordinates: { lat: 22.3364, lng: 103.8438 },
    transportPerPerson: 800000, localPerPersonPerDay: 100000, arrivalTime: '13:00',
    guideUrl: 'https://vietnam.travel/vi/places-to-go/northern-vietnam/sapa',
    color: 'linear-gradient(135deg, #4f6584, #9dacc4)',
    activities: [
      place('Dạo trung tâm Sa Pa', 0, ['Chụp ảnh', 'Ẩm thực'], 1),
      place('Ngắm cảnh thung lũng Mường Hoa', 0, ['Thiên nhiên', 'Chụp ảnh'], 1),
      place('Thăm bản Cát Cát', 150000, ['Văn hóa', 'Thiên nhiên'], 2),
      place('Chinh phục Fansipan', 900000, ['Thiên nhiên', 'Chụp ảnh'], 2, 'Cáp treo là khoản ước tính lớn; cần kiểm tra giá thực tế.'),
      place('Trekking qua bản Lao Chải', 250000, ['Thiên nhiên', 'Văn hóa'], 3),
      place('Khám phá bản Tả Van', 100000, ['Văn hóa', 'Thiên nhiên'], 3),
      place('Ngắm ruộng bậc thang', 0, ['Thiên nhiên', 'Chụp ảnh'], 4),
      place('Thăm chợ địa phương', 0, ['Mua sắm', 'Văn hóa'], 4),
      place('Tham quan núi Hàm Rồng', 100000, ['Thiên nhiên'], 5),
      place('Thử món địa phương ở Sa Pa', 150000, ['Ẩm thực'], 5, 'Khoản này có thể thay cho một bữa ăn mặc định.'),
    ],
  },
  {
    city: 'Hà Giang', emoji: '🏔️', meta: 'Cao nguyên đá · Đèo núi · Bản làng', minDays: 3,
    coordinates: { lat: 22.8026, lng: 104.9784 },
    transportPerPerson: 900000, localPerPersonPerDay: 180000, arrivalTime: '14:00',
    guideUrl: 'https://vietnam.travel/vi/node/199',
    color: 'linear-gradient(135deg, #735a49, #b7986a)',
    activities: [
      place('Dạo thành phố Hà Giang', 0, ['Ẩm thực', 'Chụp ảnh'], 1),
      place('Ngắm cảnh Núi Cấm', 0, ['Thiên nhiên', 'Chụp ảnh'], 1),
      place('Cổng trời Quản Bạ', 0, ['Thiên nhiên', 'Chụp ảnh'], 2),
      place('Núi đôi Cô Tiên', 0, ['Thiên nhiên'], 2),
      place('Dinh thự họ Vương', 50000, ['Văn hóa'], 3),
      place('Dạo phố cổ Đồng Văn', 0, ['Văn hóa', 'Ẩm thực'], 3),
      place('Đèo Mã Pí Lèng', 0, ['Thiên nhiên', 'Chụp ảnh'], 4, 'Cần kiểm tra điều kiện đường và phương tiện.'),
      place('Ngắm sông Nho Quế', 250000, ['Thiên nhiên', 'Chụp ảnh'], 4),
      place('Cột cờ Lũng Cú', 60000, ['Văn hóa', 'Chụp ảnh'], 5),
      place('Ghé chợ phiên vùng cao', 0, ['Văn hóa', 'Mua sắm'], 5, 'Chợ phiên phụ thuộc ngày họp chợ.'),
    ],
  },
]

export const destinationNames = northernDestinations.map((destination) => destination.city)

export function findDestination(city) {
  return northernDestinations.find((destination) => destination.city === city)
}
