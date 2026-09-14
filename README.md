# Học Viện Ads Blogger Theme

Repository phát triển và quản lý phiên bản giao diện Blogger của Học Viện Ads.

## Quy ước nhánh

- `main`: baseline/production ổn định.
- `develop`: tích hợp các thay đổi đã kiểm tra.
- `feature/*`, `fix/*`, `seo/*`, `perf/*`, `a11y/*`: nhánh làm việc ngắn hạn.

## Cấu trúc mục tiêu

```text
src/
  css/
  js/
  template/
dist/
scripts/
.github/workflows/
```

## Quy trình

1. Không chỉnh trực tiếp production nếu không cần thiết.
2. Tạo branch từ `develop`.
3. Chỉnh source trong `src/`.
4. Build ra `dist/hocvienads.xml`.
5. Upload file `dist/hocvienads.xml` lên Blogger staging để kiểm tra.
6. Mở Pull Request, review diff, rồi merge.
7. Sau khi ổn định, merge vào `main` và deploy production.

## Baseline

Template nguồn ban đầu: `theme-3023845336076067262.xml`.

SHA-256 baseline cục bộ: `b8e99934e5da4466ba6c59c8d51b95b490e7817704b074cc0bd2592bfff0b98f`.

Xem Issue #1 để theo dõi audit UI/UX và roadmap refactor.
