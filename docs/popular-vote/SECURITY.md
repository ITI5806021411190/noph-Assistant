# Popular Vote Security

## Auth

- ผู้ร่วมโหวตใช้ Anonymous Auth
- Admin และ Stage ใช้ Google Sign-in
- เฉพาะ email `wongnazaipot@gmail.com` และ `email_verified=true` เท่านั้นที่อ่านคะแนนรวม/แก้ไขข้อมูลได้

## Vote privacy

- ผู้ร่วมโหวตอ่านได้เฉพาะ vote document ของ UID ตัวเอง
- ผู้ร่วมโหวตไม่สามารถอ่าน votes ของคนอื่น
- stage/admin เท่านั้นที่ฟัง collection `votes` ได้
- ไม่มี aggregate counter doc เพื่อลด write contention

## One vote per poll

Vote document ใช้ anonymous UID เป็น document id:

```text
events/back-to-school-2569/polls/{pollId}/votes/{uid}
```

Rules อนุญาตเฉพาะ create, ไม่อนุญาต update และไม่อนุญาต delete โดย user ปกติ

## Production reminders

- อย่า deploy rules ก่อนตรวจใน Emulator
- เพิ่ม Vercel preview domain ใน Firebase Authorized domains ก่อนทดสอบ preview
- อย่าเปิดสิทธิ์อ่าน votes ให้ anonymous
