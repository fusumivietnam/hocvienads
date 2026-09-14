# Blogger template source

Đặt template Blogger hiện tại tại:

`src/template/base.xml`

File này là source-of-truth để build ra `dist/hocvienads.xml`.

## Baseline đang chờ import

Nguồn: `theme-3023845336076067262.xml`

SHA-256 kỳ vọng:

`b8e99934e5da4466ba6c59c8d51b95b490e7817704b074cc0bd2592bfff0b98f`

Sau khi import:

```bash
npm run validate
npm run build
```

Không sửa file trong `dist/` thủ công; mọi thay đổi phải quay lại source.
