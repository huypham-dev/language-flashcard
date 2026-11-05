# Lockscreen English 📱🇬🇧

App Android (Expo / React Native) hiện **thẻ học cụm từ & mẫu câu tiếng Anh** đè lên màn hình khóa, để mỗi lần bật màn hình là học được một câu.

- Giai đoạn 1: toàn bộ tính năng chạy trên **Expo Go** (JSON + AsyncStorage, không database)
- Giai đoạn 2: native module Kotlin để hiện thẻ trên lock screen thật (Xiaomi HyperOS)

📄 Spec: [`docs/superpowers/specs/2026-11-05-lockscreen-english-design.md`](docs/superpowers/specs/2026-11-05-lockscreen-english-design.md)
🗂️ Việc cần làm: xem GitHub Issues (milestone *Phase 1* / *Phase 2*).

## Chạy thử (Phase 1)

Cần Node.js 20 trở lên và app **Expo Go** (Expo SDK 58) trên điện thoại Android.

```bash
npm install
npx expo start          # quét QR bằng Expo Go
npx expo start --web    # hoặc chạy bản web trên PC
```

| Lệnh | Ý nghĩa |
|---|---|
| `npm test` | Unit test (Jest) |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | ESLint |

## Cấu trúc

```
src/app/            # màn hình (Expo Router): index, lockscreen, edit/[id], settings
src/components/     # PhraseCard, AutoShowLockscreen
src/store/          # PhraseStore (context), phrases (AsyncStorage + thao tác), validate (import/export)
src/logic/          # picker (chọn câu), search
src/lib/            # TTS, share/import file, dialog, cầu nối lockscreen
src/data/seed.json  # 50 câu mẫu
```

QA: [`docs/qa/phase-1.md`](docs/qa/phase-1.md)
