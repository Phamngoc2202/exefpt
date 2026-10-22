# TripGenie

Ứng dụng lập kế hoạch du lịch miền Bắc Việt Nam bằng React/Vite, Supabase và Gemini API.

## Chạy dự án

1. Cài gói: npm install
2. Tạo `.env.local` từ `.env.example`, điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` và `GEMINI_API_KEY` nếu muốn dùng cá nhân hóa AI.
3. Nếu chưa có bảng, chạy supabase/schema.sql trong Supabase SQL Editor.
4. Để bật trang quản trị, xác nhận email của tài khoản `phamngoc0045@gmail.com`, rồi chạy supabase/admin.sql trong Supabase SQL Editor. Dòng kết quả cuối phải có `role = admin`.
5. Chạy `supabase/trip_quota.sql` trong Supabase SQL Editor để bật hạn mức tạo chuyến đi và thao tác cấp thêm lượt. Chạy sau `admin.sql`. Các chuyến đã lưu trước đó sẽ được tính vào lượt đã dùng.
6. Chạy `supabase/auto_save.sql` trong Supabase SQL Editor để tạo chuyến đi và trừ lượt trong cùng một giao dịch. Chạy sau `trip_quota.sql`.
7. Chạy `supabase/trip_sharing.sql` để bật liên kết công khai chỉ xem, làm mới bản chụp khi chia sẻ lại và cho phép chủ chuyến đi tắt liên kết.
8. Chạy `supabase/payments.sql` để bật đơn thanh toán SePay và cộng lượt tạo chuyến đi sau khi xác nhận giao dịch. Chạy sau `trip_quota.sql`.
9. Chạy npm run dev; đăng nhập tài khoản admin và làm mới trang để thấy mục **Quản trị**.

Lệnh kiểm tra: npm test, npm run lint, npm run build.

## Gợi ý quán ăn bằng Gemini

Khi tạo chuyến đi mới, Gemini thường gợi ý tên quán. Đây là gợi ý **chưa xác minh**; liên kết Google Maps chỉ mở trang tìm kiếm để người dùng kiểm tra địa điểm và đánh giá. Không hiển thị điểm sao do AI tự đoán. Chuyến đi đã lưu còn bữa ăn chung có nút **Gợi ý quán bằng Gemini** để cập nhật mà không tốn thêm lượt tạo chuyến. Tính năng dùng `GEMINI_API_KEY`, không cần `GOOGLE_MAPS_API_KEY` hay Places API.

Nếu đã bật thanh toán cho Gemini API, có thể đặt `GEMINI_MAPS_GROUNDING=true` ở máy chủ để thử tra nguồn Google Maps trước. Google Maps Grounding không có trong Free Tier của Gemini 3.8 Flash và 3.5 Flash-Lite; hạn mức miễn phí của công cụ này chỉ áp dụng trong Paid Tier. Khi tra nguồn không khả dụng, ứng dụng quay về gợi ý chưa xác minh bằng Gemini thường. Bản đồ tuyến trong web dùng OpenStreetMap.

## Kết nối SePay cho ba gói trả phí

1. Chạy `supabase/payments.sql` trong Supabase SQL Editor. Script tạo bảng đơn hàng, bảng giao dịch và hàm xác nhận thanh toán. Khách hàng chỉ đọc được đơn của chính mình; chỉ máy chủ dùng khóa bí mật Supabase mới được xác nhận giao dịch.
2. Trên Vercel, đặt các biến môi trường máy chủ `SUPABASE_SECRET_KEY`, `SEPAY_RECEIVER_VA` (VA riêng của TripGenie), `SEPAY_RECEIVER_NAME`, `SEPAY_WEBHOOK_API_KEY` và `SEPAY_PAYMENT_MODE=live`. Giữ `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` hiện có. Dùng cùng các tên biến trong `.env.local` để chạy thử ở máy. Không đặt tiền tố `VITE_` trước khóa bí mật hoặc API Key webhook.
3. Trong SePay, tạo webhook mới cho TripGenie. URL: `https://exefpt.vercel.app/api/sepay-webhook`. Chọn **Tiền vào**, **JSON**, đúng tài khoản BIDV và chỉ VA TripGenie. Chọn xác thực **API Key**, đặt đúng chuỗi `SEPAY_WEBHOOK_API_KEY` (ít nhất 24 ký tự ngẫu nhiên), bật gửi lại khi server lỗi. Giữ webhook của website cũ và kiểm tra nó chỉ nhận VA cũ.
4. Trong Cấu hình chung của SePay, nếu dùng bộ lọc mã thanh toán, đặt tiền tố `TG`, hậu tố 10 ký tự chữ/số. Nội dung trên QR là mã riêng từng đơn, ví dụ `TG8A36D012EF`. Backend còn đọc mã trong `content` nếu trường `code` của webhook trống. Không bật bộ lọc bỏ qua giao dịch thiếu mã trước khi đã kiểm tra payload thực tế của BIDV.
5. Triển khai mã nguồn lên Vercel. Trước khi triển khai, URL webhook trên sẽ trả `404`; sau khi triển khai, truy cập bằng trình duyệt (GET) sẽ trả `405` vì endpoint chỉ nhận POST. Dùng chức năng gửi thử webhook của SePay và xem nhật ký gửi. Để thử không chuyển tiền thật, SePay Test Mode cần VA và API Key test riêng; nên dùng môi trường triển khai/Supabase test riêng để giao dịch giả không cộng lượt cho người dùng thật.

Đơn thanh toán có hiệu lực 24 giờ. Webhook chỉ cộng lượt khi đúng VA, đúng mã đơn, đúng số tiền và đúng giao dịch tiền vào; ID giao dịch SePay được lưu duy nhất để tránh cộng trùng. Gói Single Trip cộng 1 lượt, Plus cộng 20 lượt, Team cộng 50 lượt. Hiện chỉ quyền lợi **lượt tạo lịch trình** được áp dụng tự động; các giới hạn lưu chuyến, phương án dự phòng, xuất PDF theo gói và tính năng nhóm đang phát triển, được ghi rõ trên bảng giá.

## Tạo tài khoản demo hàng loạt

Chạy `npm run seed:demo-users` để chuẩn bị 20 tài khoản có tên ngẫu nhiên, email dạng `@gmail.com` và mật khẩu trong `.local/demo-users-20-2026-10-14.json` (được Git bỏ qua). Chạy lại sẽ dùng cùng danh sách, không sinh thêm email. Các địa chỉ Gmail được tạo ngẫu nhiên, không bảo đảm hộp thư tồn tại hoặc thuộc quyền sở hữu của bạn.

Để tạo thật trong Supabase Auth, chạy `supabase/admin.sql` trong SQL Editor trước để cài trigger tạo hồ sơ `public.app_users`. Vào Supabase Dashboard > Settings > API Keys, sao chép Secret key (`sb_secret_...`) vào `.env.local` dưới tên `SUPABASE_SECRET_KEY`, bên cạnh `VITE_SUPABASE_URL`. Nếu dự án chưa có Secret key, tạo key trong mục này. Không đặt tiền tố `VITE_` cho khóa bí mật. Sau đó chạy `npm run seed:demo-users -- --apply` **trong ngày 14/10/2026 theo giờ Việt Nam**. Script sẽ từ chối tạo vào ngày khác vì `created_at` là ngày tạo thật, không thể chọn ngày tham gia qua Auth Admin API. Script xác nhận email để tài khoản demo đăng nhập được, bỏ qua email đã có trong `public.app_users` và lưu tiến độ sau từng tài khoản. Với tài khoản đã có, mật khẩu trong tệp chỉ đúng nếu bạn đã dùng chính mật khẩu đó khi tạo thủ công.

Đợt bổ sung cho biểu đồ ngày 13/10/2026: chạy `npm run seed:demo-users -- --date=2026-10-13` để chuẩn bị 15 tài khoản trong `.local/demo-users-15-2026-10-13.json`, rồi thêm `--apply` để tạo thật. Supabase Auth ghi ngày tạo thật trong `auth.users`; script đặt `public.app_users.created_at` về ngày 13/10 cho đúng biểu đồ quản trị và lưu ngày demo trong metadata. Vì thế Authentication > Users vẫn hiện ngày tạo thật.

Để đổi riêng email của 15 tài khoản ngày 13/10 sang kiểu teencode teen 2k, chạy `npm run rename:demo-emails` để chuẩn bị địa chỉ mới rồi chạy `npm run rename:demo-emails -- --apply`. Script giữ nguyên ID, mật khẩu, tên và ngày tham gia, đồng bộ email trong Auth và `public.app_users`. Email cũ được giữ ở trường `previousEmail` trong tệp cục bộ để đối chiếu.

Email của 20 tài khoản ngày 14/10 dùng kiểu tên người dùng thông dụng, ví dụ `ngocvy482619@gmail.com`. Chạy `npm run rename:demo-emails -- --date=2026-10-14` để xem danh sách, rồi thêm `--apply` để đồng bộ email trong Auth. Tệp `.local/demo-users-20-2026-10-14.json` lưu email cũ trong `previousEmail`; tên, mật khẩu và ngày tham gia được giữ nguyên.

Đợt 12/10/2026 gồm 21 tài khoản: chạy `npm run seed:demo-users -- --date=2026-10-12` để chuẩn bị `.local/demo-users-21-2026-10-12.json`, rồi chạy `npm run seed:demo-users -- --date=2026-10-12 --apply` để tạo thật. Email có dạng ngắn, liền chữ như `thanhdatabcdef298@gmail.com`: hai phần cuối của tên không dấu, sáu chữ ngẫu nhiên và ba chữ số. Biểu đồ dùng ngày 12/10 trong `public.app_users`; Authentication > Users vẫn hiện ngày tạo thật.

Đợt 02–11/10/2026: chạy `npm run seed:early-demo-users` để bốc cố định 2–5 tài khoản mỗi ngày và lưu kế hoạch trong `.local/demo-users-2026-10-02-to-11.json`. Mỗi ngày có tệp `demo-users-<số lượng>-<ngày>.json` riêng trong `.local/`. Chạy `npm run seed:early-demo-users -- --apply` để tạo tài khoản đăng nhập và gắn ngày tương ứng cho biểu đồ. Chạy lại dùng kế hoạch và thông tin đăng nhập đã lưu, không bốc lại số lượng. Authentication > Users vẫn hiển thị ngày tạo thật.

## Phạm vi hiện tại

- Hỗ trợ Hà Nội, Hạ Long, Ninh Bình, Sa Pa và Hà Giang; mặc định xuất phát từ Hà Nội.
- Chuyến đi dài 1–5 ngày tùy điểm đến, từ 1–10 người.
- Lịch trình sinh từ dữ liệu mẫu trong src/data/northernDestinations.js theo ngày, sở thích, số người và phong cách du lịch.
- Chi phí được cộng từ từng hoạt động, di chuyển, ăn uống, lưu trú và dự phòng 10%. Tạo chuyến đi sẽ tự lưu; sau đó có thể thêm, sửa, xóa hoạt động và chi phí rồi bấm **Lưu thay đổi**.
- Khi có `GEMINI_API_KEY`, bước tạo chuyến đi gợi ý tên quán bằng Gemini. Tên quán chưa được xác minh và có liên kết tìm kiếm Google Maps để người dùng kiểm tra. Giá bữa ăn vẫn là dự toán theo phong cách, số người, không phải giá thực đơn.
- Supabase Auth để đăng nhập/đăng ký; mỗi người chỉ xem và chỉnh các chuyến đi của mình nhờ RLS trong supabase/schema.sql.
- Mở lại, sửa và xóa chuyến đã lưu. Chuyến cũ ở định dạng JSON trước đây vẫn đọc được.
- Chuyến đã lưu có thể tạo liên kết công khai chỉ xem, chia sẻ qua ứng dụng, tắt liên kết và in hoặc lưu PDF trực tiếp từ trình duyệt.
- Trang Quản trị cho phép admin tìm tài khoản và cấp/thu hồi vai trò admin. Quyền được kiểm tra bằng RLS trong Supabase, không dựa vào email ở frontend. Admin không được xem chuyến đi riêng của người khác; chính tài khoản admin không thể tự hạ quyền.
- Mỗi tài khoản có 1 lượt tạo chuyến đi ban đầu. Supabase chỉ trừ lượt khi chuyến đi tạo và lưu thành công; nếu lưu lỗi, lượt không bị mất. Xóa chuyến đã lưu không hoàn lại lượt. Admin có thể cấp thêm 1–100 lượt mỗi lần từ trang Quản trị. Người dùng vẫn xem và chỉnh sửa chuyến đã lưu khi hết lượt.
- Bảng giá gồm Free (0đ), Single Trip (20.000đ/lần), TripGenie Plus (99.000đ/lần) và Team (349.000đ/sự kiện hoặc dự án nhóm). Sau khi cấu hình SePay và chạy SQL thanh toán, ba gói trả phí tự cộng số lượt tạo tương ứng. Free hiện tự lưu chuyến đi sau khi tạo thành công; các quyền lợi trả phí khác chưa được thực thi và được đánh dấu đang phát triển trên bảng giá.

**Lưu ý:** Mọi mức giá là ước tính tham khảo, không phải giá thời gian thực hay báo giá đặt chỗ. Hãy kiểm tra lại vé, phòng, giờ mở cửa và thời gian di chuyển trước khi đi. Dữ liệu điểm tham quan tham khảo từ [Cục Du lịch Quốc gia Việt Nam](https://vietnam.travel/vi/places-to-go/northern-vietnam).

Ảnh điểm đến nổi bật lấy từ Wikimedia Commons; tác giả và giấy phép được ghi ngay trên giao diện.
