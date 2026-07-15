# Popular Vote Install

โมดูล Popular Vote ใช้ Firebase Firestore แยกจากฐานข้อมูลหลักของ Health Assistant OS

## Routes

- `/popular-vote/` หน้าผู้ร่วมโหวต ใช้ Anonymous Auth
- `/popular-vote/stage/` หน้าเวที ใช้ Google Sign-in เฉพาะผู้ดูแล
- `/popular-vote/admin/` แผงควบคุม ใช้ Google Sign-in เฉพาะผู้ดูแล

## Deploy ขั้นต่ำ

1. อัปไฟล์ทั้งหมดใน repo ไป GitHub/Vercel เดิม
2. Firebase Console: เพิ่ม Authorized domains
   - `noph-assistant.vercel.app`
   - `localhost`
   - Vercel preview domain ที่ใช้ทดสอบ
3. Firebase Console: เปิด Authentication providers
   - Anonymous
   - Google
4. Deploy Firestore rules ด้วย Firebase CLI เมื่อทดสอบแล้ว

```bash
firebase use haos-back-to-school-vote-2569
firebase deploy --only firestore:rules
```

## First run

1. วางรูปผู้เข้าประกวด:
   - ภาพถ่ายตอนเด็ก: `popular-vote/assets/child-photo/01.png`, `02.png`, ...
   - แต่งกายตามธีม: `popular-vote/assets/costume/01.png`, `02.png`, ...
2. เปิด `/popular-vote/admin/`
3. Login ด้วยบัญชีผู้ดูแล
4. เลือกหมวด `child-photo` หรือ `costume`
5. ตั้ง `จำนวนผู้เข้าประกวด`
6. กด `อัปเดตรายชื่อ/รูปหมวดนี้`
7. ตั้งเวลา/จำนวนผู้มีสิทธิ์ แล้วกด `เปิดโหวต`
8. เปิด `/popular-vote/stage/` บนจอ projector
9. ให้ผู้ร่วมงานสแกน QR จาก stage เพื่อโหวต
