# Lockscreen English — Design Spec

- **Ngày:** 2026-11-05
- **Trạng thái:** Đã duyệt (brainstorming)
- **Thiết bị mục tiêu:** Android — Xiaomi 15T (HyperOS)

## 1. Mục tiêu

Học tiếng Anh thụ động: mỗi lần bật màn hình là thấy một **thẻ học toàn màn hình** (cụm từ / mẫu câu, nghĩa, ví dụ) hiện đè lên màn hình khóa. Vuốt thẻ đi là về màn hình khóa thật.

**Ràng buộc**
- MVP nhanh, **không database**. Dữ liệu lưu dạng JSON (AsyncStorage).
- PC không có Android Studio: dev bằng **Expo Go**, build bằng **EAS Build** (cloud).
- MVP **chỉ có chữ** (chưa có ảnh). Các trường mới như `image` sẽ thêm sau qua migration.

**Ngoài phạm vi MVP:** ảnh, đồng bộ cloud, tài khoản, lặp lại ngắt quãng kiểu Anki, iOS.

**Tiêu chí thành công**
- Giai đoạn 1: chạy đầy đủ trên Expo Go. Thêm/sửa/xóa câu, thẻ học, import/export JSON đều hoạt động.
- Giai đoạn 2: trên Xiaomi 15T, bật màn hình → thẻ học hiện đè lên màn hình khóa trong vòng 1 giây; vuốt → về màn hình khóa.

## 2. Lộ trình

| Giai đoạn | Nội dung | Môi trường |
|---|---|---|
| **1** | Toàn bộ tính năng bằng JS thuần, có "chế độ giả lập màn hình khóa" | Expo Go |
| **2** | Native module (Kotlin) mở route `/lockscreen` đè lên màn hình khóa khi bật màn hình | EAS development/preview build |

Nguyên tắc: **thẻ học là route riêng `/lockscreen`**. Native ở giai đoạn 2 chỉ mở route đó, giao diện React được dùng lại nguyên vẹn.

## 3. Tech stack

- Expo SDK (bản ổn định mới nhất), TypeScript
- Expo Router để điều hướng
- `@react-native-async-storage/async-storage` để lưu JSON
- `expo-speech` để đọc TTS
- `expo-document-picker` + `expo-file-system` + `expo-sharing` cho import/export
- Jest (`jest-expo`) cho unit test

## 4. Màn hình

| Route | Chức năng |
|---|---|
| `/lockscreen` | Thẻ toàn màn hình, nền tối, cụm từ cỡ chữ to. Chạm để lật xem nghĩa và ví dụ. Có các nút 🔊 Đọc · ✅ Đã thuộc (hoặc "Chưa thuộc lắm" khi câu đã ở `mastered`) · ⏭️ Câu khác. Vuốt lên để đóng. |
| `/` | Danh sách câu, ô tìm kiếm (theo `phrase`/`meaning`), lọc theo trạng thái, số liệu nhanh ("32 đang học · 18 đã thuộc"), nút ➕ |
| `/edit/[id]` | Form thêm (`id = new`) hoặc sửa câu: `phrase`*, `meaning`*, `example`, `exampleVi`, `tags`. Có nút xóa (kèm xác nhận). |
| `/settings` | Bật/tắt "Tự hiện thẻ khi mở app", xuất/nhập JSON, khôi phục bộ câu mẫu. (Giai đoạn 2 thêm: bật/tắt "Hiện trên màn hình khóa" và màn hướng dẫn cấp quyền.) |

**Luồng giai đoạn 1:** mở app hoặc chuyển app từ nền lên (`AppState` → `active`) mà `autoShowOnOpen = true` → điều hướng tới `/lockscreen`. Vuốt hoặc đóng → về `/`.

## 5. Cấu trúc code

```
src/app/                      # Expo Router screens (quy ước của template SDK 58)
  _layout.tsx
  index.tsx
  lockscreen.tsx
  edit/[id].tsx
  settings.tsx
src/data/seed.json            # ~50 câu mẫu
src/store/phrases.ts          # load/save/CRUD/import/export/migrate
src/store/validate.ts         # kiểm tra Phrase & file import
src/logic/picker.ts           # thuật toán chọn câu (pure)
src/components/PhraseCard.tsx # thẻ dùng chung
src/types.ts
modules/lockscreen/           # (giai đoạn 2) Expo local module, Kotlin
```

## 6. Mô hình dữ liệu

```ts
type PhraseStatus = "learning" | "mastered";

interface Phrase {
  id: string;            // ví dụ "p001" hoặc uuid khi tạo trong app
  phrase: string;        // bắt buộc, không rỗng
  meaning: string;       // bắt buộc, không rỗng
  example?: string;
  exampleVi?: string;
  tags?: string[];
  status: PhraseStatus;  // mặc định "learning"
  seenCount: number;     // mặc định 0
  lastSeenAt?: string;   // ISO 8601
  createdAt: string;     // ISO 8601
}

interface AppData {
  version: 1;
  phrases: Phrase[];
  settings: { autoShowOnOpen: boolean }; // mặc định true
  recentIds: string[];   // tối đa 5, mới nhất ở cuối
}
```

- Một key AsyncStorage duy nhất: `lockscreen-english/data`.
- Lần đầu chạy (key chưa có): tạo `AppData` từ `seed.json`.
- Mỗi lần thay đổi thì ghi lại toàn bộ JSON (dữ liệu nhỏ, chỉ vài chục KB).
- `version` dùng cho migration. Hàm `migrate(raw): AppData` nâng dữ liệu cũ lên version mới mà không mất câu.

## 7. Thuật toán chọn câu (`picker.ts`)

`pick(phrases, recentIds, random = Math.random): Phrase | null`

1. `phrases` rỗng → trả về `null`.
2. Ứng viên = các câu có id **không** nằm trong `recentIds`. Nếu không còn ứng viên nào thì dùng toàn bộ `phrases`.
3. Chia thành 2 nhóm `learning` và `mastered`. Rút thăm: `random() < 0.9` → chọn nhóm `learning`, ngược lại chọn `mastered`. Nhóm được chọn rỗng thì dùng nhóm còn lại.
4. Trong nhóm: trọng số `w = 1 / (1 + seenCount)`, chọn theo trọng số bằng `random()`.

`markSeen(data, id)`: `seenCount++`, `lastSeenAt = now`, đẩy id vào `recentIds` (giữ tối đa 5).

**Hành động:** ✅ Đã thuộc → `status = "mastered"` rồi chuyển câu khác. "Chưa thuộc lắm" → `status = "learning"`.

## 8. Import / Export

- **Export:** ghi `{ version, phrases }` ra file `lockscreen-english-YYYYMMDD.json`, mở share sheet.
- **Import:** chọn file `.json`. Nhận một trong hai dạng: `{ phrases: [...] }` hoặc mảng `[...]`.
  - Kiểm tra từng phần tử: bắt buộc có `phrase` và `meaning` là chuỗi không rỗng. Các trường thiếu thì điền mặc định; thiếu `id` thì sinh id mới.
  - Phần tử lỗi bị bỏ qua, sau đó báo: *"Đã nhập X câu, bỏ qua Y câu lỗi"*.
  - Có 2 chế độ: **Gộp** (trùng `id` thì ghi đè) và **Thay thế toàn bộ** (phải xác nhận trước).

## 9. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| JSON trong storage hỏng | Lưu chuỗi hỏng sang key `lockscreen-english/corrupt-<timestamp>`, nạp lại seed, hiện cảnh báo |
| Danh sách rỗng | Thẻ hiện "Chưa có câu nào, thêm câu đi bạn ơi 🥲" + nút ➕ |
| Máy không có giọng TTS tiếng Anh | Ẩn nút 🔊 (`Speech.getAvailableVoicesAsync()`) |
| File import sai định dạng | Báo lỗi, không thay đổi dữ liệu |
| Ghi storage thất bại | Toast báo lỗi, giữ nguyên dữ liệu đang có trong bộ nhớ |

## 10. Giai đoạn 2: Native lockscreen (Android)

**Đóng gói:** Expo local module `modules/lockscreen` (`npx create-expo-module --local`), viết bằng Kotlin.

**Cơ chế**
1. `start()` → khởi chạy **foreground service** (`foregroundServiceType="specialUse"`), kèm thông báo cố định mức ưu tiên thấp.
2. Service đăng ký động (lúc chạy) một `BroadcastReceiver` cho `ACTION_SCREEN_ON`.
3. Khi màn hình bật → mở activity bằng deep link `lockscreenenglish://lockscreen`, với `setShowWhenLocked(true)` và `setTurnScreenOn(true)`.
4. `dismiss()` (gọi từ JS khi vuốt hoặc đóng) → `moveTaskToBack(true)` để lộ ra màn hình khóa thật.
5. Receiver `BOOT_COMPLETED` khởi động lại service nếu tính năng đang bật.

**API phía JS:** `isSupported()`, `start()`, `stop()`, `isRunning()`, `getPermissions()`, `openPermissionSettings(kind)`, `dismiss()`.
Trong Expo Go hoặc trên web, `isSupported()` trả về `false` và giao diện ẩn tính năng này.

**Quyền (Xiaomi HyperOS)**, mỗi quyền có nút mở cài đặt trong màn hướng dẫn:
- `SYSTEM_ALERT_WINDOW` (Hiển thị trên ứng dụng khác): cho phép mở activity từ nền (Android 10 trở lên)
- Hiển thị cửa sổ bật lên khi chạy nền (quyền riêng của MIUI)
- Hiển thị trên màn hình khóa (quyền riêng của MIUI)
- Tự khởi động
- Pin: Không giới hạn
- `POST_NOTIFICATIONS` (Android 13 trở lên) cho thông báo của foreground service

**Build:** EAS profile `development` (dev client APK) và `preview` (APK cài trực tiếp).

**Rủi ro:** HyperOS có thể chặn việc mở activity từ nền. **Bước đầu tiên của giai đoạn 2 là một bản thử nhỏ** trên Xiaomi 15T. Nếu thất bại, chuyển sang phương án dự phòng: notification với `fullScreenIntent` (`USE_FULL_SCREEN_INTENT`; trên Android 14 trở lên người dùng phải tự cấp quyền trong cài đặt).

## 11. Testing

- **Unit (Jest):** `picker.ts` (loại câu gần đây, fallback khi bỏ hết, tỉ lệ 90/10 với `random` cố định, nhóm rỗng, trọng số theo `seenCount`), `validate.ts`, `migrate`, logic import gộp/thay thế.
- **Thủ công:** checklist trên Expo Go (giai đoạn 1) và trên Xiaomi 15T (giai đoạn 2).
