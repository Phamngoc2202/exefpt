const commonsPhoto = (file, title, credit) => ({
  title,
  credit,
  src: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=1200`,
  source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
})

export const destinationDetails = {
  'Hà Nội': {
    summary: 'Nhịp sống hiện đại đan xen khu phố cổ, hồ nước, di tích và một nền ẩm thực đường phố đặc trưng.',
    bestTime: 'Tháng 3–4 và 9–11',
    suitableFor: 'Văn hóa, ẩm thực, chuyến đi ngắn',
    tip: 'Nên dành ít nhất một buổi đi bộ quanh hồ Hoàn Kiếm và khu phố cổ.',
    gallery: [
      commonsPhoto('Hoan Kiem Lake photo.jpg', 'Hồ Hoàn Kiếm', 'Tranhuutukkt · CC BY-SA 4.0'),
      commonsPhoto('Hanoi Temple of Literature.jpg', 'Văn Miếu – Quốc Tử Giám', 'Chuoibk · CC BY-SA 3.0'),
      commonsPhoto('Hanoi Old Quarter (40267872341).jpg', 'Phố cổ Hà Nội', 'Mig Gilbert · CC BY-SA 2.0'),
      commonsPhoto('Hanoi Old Quarter, 9 March 2019-2.jpg', 'Phố cổ về đêm', 'Alexey Komarov · CC BY-SA 4.0'),
    ],
  },
  'Hạ Long': {
    summary: 'Kỳ quan biển đảo với hàng nghìn núi đá vôi, hang động và những hành trình du thuyền giữa vịnh.',
    bestTime: 'Tháng 3–5 và 9–11',
    suitableFor: 'Biển, nghỉ dưỡng, chèo kayak',
    tip: 'Kiểm tra thời tiết và tình trạng vận hành của tàu trước ngày khởi hành.',
    gallery: [
      commonsPhoto('Kayaks in Ha Long Bay.jpg', 'Chèo kayak giữa vịnh', 'Christophe95 · CC BY-SA 4.0'),
      commonsPhoto('Cave in Ha Long Bay.jpg', 'Hang động trên Vịnh Hạ Long', 'Ivar Abrahamsen · CC BY-SA 2.0'),
      commonsPhoto('Ha Long Bay - Halong1431.jpg', 'Cửa hang và núi đá vôi', 'lumoplank · CC0'),
      commonsPhoto('Virgin Beach.jpg', 'Bãi tắm giữa lòng vịnh', 'David Stanley · CC BY 4.0'),
    ],
  },
  'Ninh Bình': {
    summary: 'Non nước, hang động và di sản cố đô tạo nên hành trình thiên nhiên xen lẫn chiều sâu văn hóa.',
    bestTime: 'Tháng 1–4 và 9–11',
    suitableFor: 'Thiên nhiên, văn hóa, chụp ảnh',
    tip: 'Nên bắt đầu các điểm ngoài trời sớm để tránh nắng và đông khách.',
    gallery: [
      commonsPhoto('Trang An, Ninh Binh.jpg', 'Danh thắng Tràng An', 'GieohatchoHaiLy · CC0'),
      commonsPhoto('Tam Coc Sailing.jpg', 'Đi thuyền Tam Cốc', 'LigerCommon · Public domain'),
      commonsPhoto('Tam Coc from above.jpg', 'Tam Cốc nhìn từ trên cao', 'Nomad Tales · CC BY-SA 2.0'),
      commonsPhoto('TamCoc-BichDong.jpg', 'Tam Cốc – Bích Động', 'Minh Phượng · CC BY-SA 3.0'),
    ],
  },
  'Sa Pa': {
    summary: 'Thị trấn vùng cao nổi bật với ruộng bậc thang, bản làng và những cung trekking giữa núi rừng.',
    bestTime: 'Tháng 3–5 và 9–11',
    suitableFor: 'Trekking, săn mây, bản làng',
    tip: 'Nhiệt độ thay đổi nhanh; nên mang áo khoác nhẹ và giày có độ bám tốt.',
    gallery: [
      commonsPhoto('Rice terraces in Sapa, Vietnam.jpg', 'Ruộng bậc thang Sa Pa', 'Eerin25 · CC0'),
      commonsPhoto('Cable car station going Fansipan.jpg', 'Ga cáp treo Fansipan', 'Khoitran1957 · CC BY-SA 4.0'),
      commonsPhoto('Terraced fields Sa Pa Vietnam.JPG', 'Thung lũng ruộng bậc thang', 'Konstantin Krismer · CC BY 3.0'),
      commonsPhoto('Terrace Sapa Vietnam.jpg', 'Nhịp sống trên ruộng bậc thang', 'Laura Lo Forti · CC BY 2.0'),
    ],
  },
  'Hà Giang': {
    summary: 'Cao nguyên đá, đèo núi và những bản làng tạo nên một trong những cung đường ngoạn mục nhất miền Bắc.',
    bestTime: 'Tháng 3–5 và 9–11',
    suitableFor: 'Đèo núi, khám phá, nhiếp ảnh',
    tip: 'Cung đường dài và nhiều đèo; ưu tiên lịch trình thong thả và kiểm tra phương tiện kỹ.',
    gallery: [
      commonsPhoto('Ha Giang, Vietnam.jpg', 'Núi rừng Hà Giang', 'Quangpraha · CC0'),
      commonsPhoto('Ma Pi Leng Pass winding road Ha Giang Vietnam.jpg', 'Đèo Mã Pí Lèng', 'Khánh Hmoong · CC BY 2.0'),
      commonsPhoto('Karst@SinhLung DongVan HaGiang.jpg', 'Cao nguyên đá Đồng Văn', 'BacLuong · Public domain'),
      commonsPhoto('Đồng Văn, Vietnam - 1.jpg', 'Thung lũng Đồng Văn', 'Benjamin Smith · CC BY-SA 4.0'),
    ],
  },
}
