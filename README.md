# TripGenie

Ứng dụng lập kế hoạch du lịch miền Bắc Việt Nam bằng React/Vite và Supabase. Bản hiện tại **không dùng Gemini API**.

## Chạy dự án

1. Cài gói: npm install
2. Tạo .env.local từ .env.example, điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY.
3. Nếu chưa có bảng, chạy supabase/schema.sql trong Supabase SQL Editor.
4. Để bật trang quản trị, xác nhận email của tài khoản `phamngoc0045@gmail.com`, rồi chạy supabase/admin.sql trong Supabase SQL Editor. Dòng kết quả cuối phải có `role = admin`.
5. Chạy `supabase/trip_quota.sql` trong Supabase SQL Editor để bật hạn mức tạo chuyến đi và thao tác cấp thêm lượt. Chạy sau `admin.sql`. Các chuyến đã lưu trước đó sẽ được tính vào lượt đã dùng.
6. Chạy `supabase/auto_save.sql` trong Supabase SQL Editor để tạo chuyến đi và trừ lượt trong cùng một giao dịch. Chạy sau `trip_quota.sql`.
7. Chạy npm run dev; đăng nhập tài khoản admin và làm mới trang để thấy mục **Quản trị**.

Lệnh kiểm tra: npm test, npm run lint, npm run build.

## Phạm vi hiện tại

- Hỗ trợ Hà Nội, Hạ Long, Ninh Bình, Sa Pa và Hà Giang; mặc định xuất phát từ Hà Nội.
- Chuyến đi dài 1–5 ngày tùy điểm đến, từ 1–10 người.
- Lịch trình sinh từ dữ liệu mẫu trong src/data/northernDestinations.js theo ngày, sở thích, số người và phong cách du lịch.
- Chi phí được cộng từ từng hoạt động, di chuyển, ăn uống, lưu trú và dự phòng 10%. Tạo chuyến đi sẽ tự lưu; sau đó có thể thêm, sửa, xóa hoạt động và chi phí rồi bấm **Lưu thay đổi**.
- Supabase Auth để đăng nhập/đăng ký; mỗi người chỉ xem và chỉnh các chuyến đi của mình nhờ RLS trong supabase/schema.sql.
- Mở lại, sửa và xóa chuyến đã lưu. Chuyến cũ ở định dạng JSON trước đây vẫn đọc được.
- Trang Quản trị cho phép admin tìm tài khoản và cấp/thu hồi vai trò admin. Quyền được kiểm tra bằng RLS trong Supabase, không dựa vào email ở frontend. Admin không được xem chuyến đi riêng của người khác; chính tài khoản admin không thể tự hạ quyền.
- Mỗi tài khoản có 1 lượt tạo chuyến đi ban đầu. Supabase chỉ trừ lượt khi chuyến đi tạo và lưu thành công; nếu lưu lỗi, lượt không bị mất. Xóa chuyến đã lưu không hoàn lại lượt. Admin có thể cấp thêm 1–100 lượt mỗi lần từ trang Quản trị. Người dùng vẫn xem và chỉnh sửa chuyến đã lưu khi hết lượt.
- Gói Plus (99.000đ/3 tháng) và Pro (499.000đ/12 tháng) hiện chỉ là giao diện giới thiệu, chưa có thanh toán hoặc kích hoạt gói. Giới hạn lượt Free và lượt admin cấp thêm đã hoạt động sau khi chạy SQL.

**Lưu ý:** Mọi mức giá là ước tính tham khảo, không phải giá thời gian thực hay báo giá đặt chỗ. Hãy kiểm tra lại vé, phòng, giờ mở cửa và thời gian di chuyển trước khi đi. Dữ liệu điểm tham quan tham khảo từ [Cục Du lịch Quốc gia Việt Nam](https://vietnam.travel/vi/places-to-go/northern-vietnam).

Ảnh điểm đến trên giao diện là hình minh họa tạo bằng AI, không phải ảnh xác thực của địa điểm.
