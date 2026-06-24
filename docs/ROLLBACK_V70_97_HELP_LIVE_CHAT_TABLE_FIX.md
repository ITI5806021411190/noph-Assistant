# Rollback v70.97 Help Live Chat Table Fix

## Scope

Patch นี้แก้ popup `ตั้งค่าผู้ติดต่อ Help Center / Live Chat` ในเครื่องมือผู้ดูแลระบบ โดยเพิ่ม CSS/JS เพื่อจัดตารางรายชื่อผู้ติดต่อใหม่เป็น grid ที่คุมคอลัมน์ชัดเจน และ bump service worker cache

ไฟล์ที่แก้:

- `index.html`
- `sw.js`
- `docs/ROLLBACK_V70_97_HELP_LIVE_CHAT_TABLE_FIX.md`

## Rollback Steps

1. เปิด `index.html`
2. ลบ block ต่อไปนี้ออก:
   - `<style id="haos-v70-97-help-live-chat-table-fix-style"> ... </style>`
   - `<script id="haos-v70-97-help-live-chat-table-fix-script"> ... </script>`
3. เปิด `sw.js`
4. เปลี่ยน `CACHE_NAME` กลับเป็นค่าก่อนหน้า:

```js
const CACHE_NAME = 'haos-v70-96-help-upcoming-fixes';
```

5. อัปโหลด `index.html` และ `sw.js` ขึ้น GitHub/Vercel
6. หลัง deploy ให้ hard refresh หรือ unregister service worker 1 ครั้งเพื่อเคลียร์ cache เก่า

## Validation

หลัง rollback หรือหลัง patch ควรตรวจ:

- เปิด Super Admin tools
- เปิด `Help Center / Live Chat`
- เปิด popup `ตั้งค่าผู้ติดต่อ Help Center / Live Chat`
- ตรวจว่าแถวรายชื่อยังเลือก checkbox ได้
- ค้นหารายชื่อได้
- บันทึกผู้ติดต่อได้

