# QA Phase 1 – Expo Go

Issue: #13

## Đã kiểm tra tự động (trong cloud, 2026-11-05)

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Unit test (picker, validate, store, search) | `npm test`: 49 test | ✅ |
| Typecheck / lint | `npm run typecheck`, `npm run lint` | ✅ |
| Bundle Android + web | `npx expo export --platform android --platform web` | ✅ |
| Lần đầu có 50 câu mẫu | Playwright trên bản web | ✅ |
| Khởi động lạnh → tự hiện thẻ | Playwright | ✅ |
| Thẻ: lật, ✅ Đã thuộc, ⏭️ Câu khác, ✕, vuốt lên để đóng | Playwright | ✅ |
| Tìm kiếm không dấu ("di ngu" → "Hit the sack"), lọc, thống kê | Playwright | ✅ |
| Thêm câu (báo lỗi khi bỏ trống) / sửa / xóa | Playwright | ✅ |
| Mở thẳng `/edit/<id>` thì form điền đúng dữ liệu; id không tồn tại thì hiện "không còn tồn tại" | Playwright | ✅ |
| Export JSON (`lockscreen-english-YYYYMMDD.json`) | Playwright (download) | ✅ |
| Import file lỗi → báo lỗi; import gộp → "Đã nhập 2 câu, bỏ qua 2 câu lỗi" | Playwright | ✅ |
| Tải lại trang, dữ liệu vẫn còn | Playwright | ✅ |
| Tắt "Tự hiện thẻ" → không hiện thẻ khi mở | Playwright | ✅ |

> Bản web chạy cùng code với bản mobile, nhưng các phần native (TTS, share sheet, document picker, AppState trên Android) **phải test trên điện thoại thật**.

## Cần test trên Xiaomi 15T (Expo Go)

```bash
npm install
npx expo start   # quét QR bằng app Expo Go
```

- [ ] Lần đầu mở có 50 câu mẫu, thẻ học tự hiện
- [ ] Thêm / sửa / xóa câu; tắt hẳn app (vuốt khỏi đa nhiệm) mở lại, dữ liệu vẫn còn
- [ ] Thẻ: lật, 🔊 đọc tiếng Anh, ✅, ⏭️, vuốt lên để đóng
- [ ] Câu vừa hiện không lặp lại trong 5 lượt tiếp theo
- [ ] Export: share sheet mở ra, gửi file qua Zalo/Drive được
- [ ] Import lại chính file đó (gộp, thay thế)
- [ ] Import file lỗi được báo đúng
- [ ] Về màn hình chính rồi mở lại app → tự hiện thẻ (tắt cài đặt thì không hiện)
- [ ] Sau khi export/import, quay về app **không** bị thẻ học bật lên đè
