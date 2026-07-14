# Popular Vote Install

โมดูลนี้เพิ่ม Popular Vote สำหรับงาน Back to School โดยใช้ Firebase Firestore แยกจากฐานข้อมูลหลักของ Health Assistant OS

## Routes

- `/popular-vote/` หน้าผู้ร่วมโหวต ใช้ Anonymous Auth
- `/popular-vote/stage/` หน้าจอเวที ใช้ Google Sign-in เฉพาะ `wongnazaipot@gmail.com`
- `/popular-vote/admin/` แผงควบคุม ใช้ Google Sign-in เฉพาะ `wongnazaipot@gmail.com`

## Deploy ขั้นต่ำ

1. อัปไฟล์ทั้งหมดใน repo ไป GitHub/Vercel เดิม
2. Firebase Console: เพิ่ม Authorized domains
   - `noph-assistant.vercel.app`
   - `localhost`
   - Vercel preview domain ที่ใช้ทดสอบ
3. Firebase Console: เปิด Authentication providers
   - Anonymous
   - Google
4. Deploy Firestore rules ด้วย Firebase CLI เมื่อตรวจแล้ว

```bash
firebase use haos-back-to-school-vote-2569
firebase deploy --only firestore:rules
```

## First run

1. เปิด `/popular-vote/admin/`
2. Login ด้วย `wongnazaipot@gmail.com`
3. กด `Seed / อัปเดตรายชื่อ`
4. เลือกหมวด `child-photo` หรือ `costume`
5. ตั้งเวลา/จำนวนผู้มีสิทธิ์
6. กด `เปิดโหวต`
7. เปิด `/popular-vote/stage/` บนจอ projector
8. ให้ผู้เข้าร่วมสแกน QR จาก stage
