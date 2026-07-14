# Popular Vote Configure

## Feature flag

เมนูใน IT Services Hub เปิดด้วยค่าเริ่มต้น:

```js
window.HAOS_FEATURES.ENABLE_POPULAR_VOTE = true;
```

ถ้าต้องการปิดชั่วคราวให้ตั้งค่าเป็น `false` ก่อนโหลด `popular-vote-module.js` หรือแก้ใน Console ระหว่างทดสอบ:

```js
window.HAOS_FEATURES.ENABLE_POPULAR_VOTE = false;
```

เมื่อปิด flag:

- การ์ดเมนูใน IT Services Hub จะไม่แสดง
- route `/popular-vote/*` จะแสดงหน้า disabled
- หน้า route จะไม่ initialize Firebase/listeners

## Candidate images

ไม่มีการใช้ Firebase Storage ตามข้อกำหนด ให้เก็บภาพไว้ใน repo เช่น:

```text
popular-vote/assets/images/child/01.jpg
popular-vote/assets/images/costume/01.jpg
```

จากนั้นแก้ไฟล์ seed:

- `popular-vote/data/child-photo.json`
- `popular-vote/data/costume.json`

ตัวอย่าง field:

```json
{
  "candidateId": "child-01",
  "number": 1,
  "displayNumber": "01",
  "title": "ผู้เข้าประกวดหมายเลข 1",
  "subtitle": "ภาพถ่ายตอนเด็ก",
  "imageUrl": "/popular-vote/assets/images/child/01.jpg",
  "active": true,
  "sortOrder": 1
}
```

## App Check

โครงสร้างโค้ดแยก Firebase init ไว้ที่ `popular-vote/assets/js/core.js` เพื่อรองรับ App Check ในอนาคต แต่เวอร์ชันนี้ยังไม่ enforce และไม่ import App Check เพราะยังจำกัดใช้ Firebase modules เฉพาะ app/auth/firestore
