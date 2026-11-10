# Chăn nuôi gia súc — app mobile (Android + iOS)

App Expo / React Native dùng chung logic với bản web: `../src/api.ts`, `../src/geo.ts`, `../src/catalog.ts`, `../src/types.ts`, `../data/*.json` và ảnh chuồng `../public/pens`. Metro được cấu hình trong `metro.config.js` để đọc các file này.

Bản web hiện là **bản demo**: không gọi máy chủ, đăng nhập nhận mọi tài khoản không rỗng. App mobile dùng cùng dữ liệu mẫu đó.

## Chức năng

| Màn | Nội dung |
| --- | --- |
| **Chuồng** | Đếm chuồng Nguy hiểm / Cảnh báo / Ổn (bấm để lọc), tìm kiếm, danh sách chuồng xếp theo mức nguy hiểm kèm nhiệt độ, độ ẩm, NH3, giai đoạn nuôi và số con. |
| Chi tiết chuồng | Camera và trạng thái mất hình. Đàn: số con, ngày tuổi, tỉ lệ sống, cân nặng, tăng trọng hoặc sữa, thân nhiệt, nhịp thở. 4 chỉ số chính (nhiệt độ, độ ẩm, NH3, CO2) với **ngưỡng theo giai đoạn nuôi** (`data/thresholds.json`). Tất cả chỉ số, biểu đồ lịch sử, cảnh báo, vận hành (thiết bị, thức ăn, cào phân, chi phí tuần), công việc. |
| **Cảnh báo** | Cảnh báo chuồng, thiết bị và xe (xe chỉ hiện với Admin). Bấm cảnh báo chuồng hoặc thiết bị để mở chuồng; bấm cảnh báo xe để mở thông tin xe. |
| Thông tin xe | Biển số, trạng thái chuyến, tiến độ, tài xế, chuồng xuất, điểm nhận (lò mổ hoặc điểm thu sữa), khối lượng, nhiệt thùng hoặc bồn so với ngưỡng (xe vật nuôi ≤ 30°C, bồn sữa ≤ 6°C), giờ, nút gọi. |
| **Tài khoản** | Tài khoản, vai trò, số chuồng, làm mới, đăng xuất. |

- **Vai trò:**
  - Công nhân chuồng: chỉ thấy chuồng mình phụ trách.
  - Chủ trại: chỉ thấy trại heo Trảng Bom.
  - Admin: thấy tất cả, kèm xe vận chuyển.
- Tab đang chọn có nền xanh nhạt sau icon.
- **Không có trên mobile:** bản đồ 3D, bảng điều phối chuyến và điểm nhận, đổi mật khẩu.

## Chạy thử

```bash
npm install
npx expo start
```

## Build APK Android (trên Windows)

Trên Windows có hai giới hạn:
1. **Gradle không build được khi đường dẫn có dấu tiếng Việt** (`Trại_heo`).
2. **Đường dẫn file object C++ không được vượt 260 ký tự.**

Vì vậy hãy chép repo sang một thư mục rất ngắn: thư mục mobile nằm ở `C:\h\m`, code dùng chung ở `C:\h\src`, `C:\h\data`, `C:\h\public`.

```bat
set SRC=D:\DỮ LIỆU PHỤC HỒI\VisualSenseGroup\projects\2026\Trại_heo
robocopy "%SRC%" C:\h /MIR /XD .git mobile node_modules dist .vercel
robocopy "%SRC%\mobile" C:\h\m /MIR /XD android node_modules
cd /d C:\h\m
npm ci
npx expo prebuild --platform android --clean
echo sdk.dir=D:/INSTALLATION> android\local.properties
```

Sửa 2 chỗ trong thư mục `android` vừa sinh ra. Chúng sẽ mất mỗi lần chạy prebuild nên phải sửa lại sau mỗi lần:
- `android/gradle.properties`: `reactNativeArchitectures=arm64-v8a,x86_64`
- `android/app/build.gradle`, ngay dưới dòng `ndkVersion …`: `externalNativeBuild { cmake { buildStagingDirectory "C:/c2" } }`

```bat
cd android && gradlew.bat assembleRelease
```

File APK nằm ở `android/app/build/outputs/apk/release/app-release.apk`. Bản này được ký bằng debug keystore, cài trực tiếp được, chưa dùng để đưa lên Google Play.

## Build iOS (EAS, trên cloud)

Cần tài khoản expo.dev và Apple Developer (99 USD/năm):

```bash
npx eas-cli login
npx eas-cli build -p ios --profile preview
```
