# Popular Vote Configure

## Feature flag

เมนู Popular Vote ใน IT Services Hub เปิดด้วยค่าเริ่มต้น:

```js
window.HAOS_FEATURES.ENABLE_POPULAR_VOTE = true;
```

ถ้าต้องการปิดชั่วคราว ให้ตั้งค่าเป็น `false` ก่อนโหลด `popular-vote-module.js`:

```js
window.HAOS_FEATURES.ENABLE_POPULAR_VOTE = false;
```

เมื่อปิด flag:

- การ์ดเมนูใน IT Services Hub จะไม่แสดง
- route `/popular-vote/*` จะแสดงหน้า disabled
- หน้า route จะไม่ initialize Firebase/listeners

## Candidate images

โมดูลนี้ไม่ใช้ Firebase Storage ให้เก็บรูปไว้ใน repo แล้ว deploy ขึ้น GitHub/Vercel ตามโฟลเดอร์นี้เท่านั้น:

```text
popular-vote/assets/child-photo/01.png
popular-vote/assets/child-photo/02.png
popular-vote/assets/child-photo/03.png

popular-vote/assets/costume/01.png
popular-vote/assets/costume/02.png
popular-vote/assets/costume/03.png
```

หลักการตั้งชื่อ:

- ใช้เลข 2 หลักตามหมายเลขผู้เข้าประกวด เช่น `01.png`, `02.png`, `03.png`
- ใช้ไฟล์ `.png` เป็นค่ามาตรฐาน แต่ระบบจะลอง fallback เป็น `.jpg`, `.jpeg`, `.webp` ให้อัตโนมัติถ้าไม่พบ `.png`
- ถ้าเปลี่ยนจำนวนผู้เข้าประกวด ให้เพิ่ม/ลดไฟล์ตามหมายเลขให้ตรงกัน

## Easy update flow

1. วางหรือแทนที่รูปในโฟลเดอร์ของหมวด เช่น `popular-vote/assets/child-photo/01.png`
2. เปิด `/popular-vote/admin/`
3. เลือกหมวด `child-photo` หรือ `costume`
4. กำหนด `จำนวนผู้เข้าประกวด`
5. กด `อัปเดตรายชื่อ/รูปหมวดนี้`

ระบบจะสร้าง/อัปเดตรายชื่อจากจำนวนที่เลือก และชี้รูปไปที่ `/popular-vote/assets/{pollId}/{number}.png` อัตโนมัติ รายการเก่าที่เกินจำนวนจะถูกปิด `active: false` เพื่อไม่ให้แสดงค้าง

## Seed files

ไฟล์ seed ใช้เป็นค่าเริ่มต้นเท่านั้น:

- `popular-vote/data/child-photo.json`
- `popular-vote/data/costume.json`

โดยทั่วไปไม่จำเป็นต้องแก้ไฟล์ JSON เอง ให้แก้รูปในโฟลเดอร์และตั้งจำนวนจากหน้า Admin แทน

## App Check

โครงสร้างโค้ดแยก Firebase init ไว้ที่ `popular-vote/assets/js/core.js` เพื่อรองรับ App Check ในอนาคต แต่เวอร์ชันนี้ยังไม่ enforce และยังไม่ import App Check เพราะใช้ Firebase modules เฉพาะ app/auth/firestore
