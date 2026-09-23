# TripGenie

Ứng dụng lập kế hoạch du lịch miền Bắc Việt Nam bằng React/Vite và Supabase. Bản hiện tại **không dùng Gemini API**.

## Chạy dự án

1. Cài gói: npm install
2. Tạo .env.local từ .env.example, điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY.
3. Nếu chưa có bảng, chạy supabase/schema.sql trong Supabase SQL Editor.
4. Chạy npm run dev.

Lệnh kiểm tra: npm test, npm run lint, npm run build.

## Phạm vi hiện tại

- Hỗ trợ Hà Nội, Hạ Long, Ninh Bình, Sa Pa và Hà Giang; mặc định xuất phát từ Hà Nội.
- Chuyến đi dài 1–5 ngày tùy điểm đến, từ 1–10 người.
- Lịch trình sinh từ dữ liệu mẫu trong src/data/northernDestinations.js theo ngày, sở thích, số người và phong cách du lịch.
- Chi phí được cộng từ từng hoạt động, di chuyển, ăn uống, lưu trú và dự phòng 10%. Có thể thêm, sửa, xóa hoạt động và chi phí trước khi lưu.
- Supabase Auth để đăng nhập/đăng ký; mỗi người chỉ xem và chỉnh các chuyến đi của mình nhờ RLS trong supabase/schema.sql.
- Mở lại, sửa và xóa chuyến đã lưu. Chuyến cũ ở định dạng JSON trước đây vẫn đọc được.

**Lưu ý:** Mọi mức giá là ước tính tham khảo, không phải giá thời gian thực hay báo giá đặt chỗ. Hãy kiểm tra lại vé, phòng, giờ mở cửa và thời gian di chuyển trước khi đi. Dữ liệu điểm tham quan tham khảo từ [Cục Du lịch Quốc gia Việt Nam](https://vietnam.travel/vi/places-to-go/northern-vietnam).
