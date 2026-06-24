# Rollback v70.98 Help Live Chat Stable Render

## Scope

Patch นี้แก้ 2 จุด:

- เปลี่ยน popup `ตั้งค่าผู้ติดต่อ Help Center / Live Chat` ให้ใช้ renderer ใหม่ ไม่พึ่งตารางเดิมที่ถูก patch ซ้อนหลายชั้น
- ซ่อน panel `สำรวจความคิดเห็นสด / Word Cloud` ที่ถูก patch เก่า auto-move มาแสดงเป็นโมดูลเต็มในแท็บ IT Services Hub

ไฟล์ที่แก้:

- `index.html`
- `sw.js`
- `docs/ROLLBACK_V70_98_HELP_LIVE_CHAT_STABLE_RENDER.md`

## Rollback Steps

1. เปิด `index.html`
2. ลบ block ต่อไปนี้ออก:
   - `<style id="haos-v70-98-help-live-chat-stable-render-style"> ... </style>`
   - `<script id="haos-v70-98-help-live-chat-stable-render-script"> ... </script>`
3. เปิด `sw.js`
4. เปลี่ยน `CACHE_NAME` กลับเป็นค่าก่อนหน้า:

```js
const CACHE_NAME = 'haos-v70-97-help-live-chat-table-fix';
```

5. อัปโหลด `index.html` และ `sw.js` ขึ้น GitHub/Vercel
6. Hard refresh หรือ unregister service worker 1 ครั้ง

## Validation

หลัง patch หรือ rollback ให้ตรวจ:

- เปิด `เครื่องมือระบบขั้นสูง`
- เปิด `Help Center / Live Chat`
- เปิด `ตั้งค่าผู้ติดต่อ Help`
- รายชื่อควรแสดงเป็นแถวชัดเจน ไม่ไหลติดกันหลังรอ 1-2 วินาที
- ค้นหารายชื่อได้
- กด `เลือกกลุ่มแนะนำ` ได้
- กด `บันทึกผู้ติดต่อ` ได้
- เปิดแท็บ `IT Services Hub` แล้วไม่ควรมี panel `สำรวจความคิดเห็นสด / Word Cloud` โผล่เองเป็นโมดูลเต็ม

