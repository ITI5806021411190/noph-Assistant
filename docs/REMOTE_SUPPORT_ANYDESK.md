# Remote Support AnyDesk Mode

โมดูลนี้ใช้ AnyDesk เป็นเครื่องมือควบคุมหน้าจอหลัก และใช้ Health Assistant OS เป็นระบบกลางสำหรับเปิดงาน ติดตามงาน แจ้งเตือน และเก็บ audit log

## Flow ผู้ใช้

1. เข้า IT Services Hub
2. เปิดเมนูช่วยเหลือผ่าน AnyDesk
3. ดาวน์โหลด/เปิด AnyDesk
4. กรอก AnyDesk ID
5. กรอกปัญหาและส่งคำขอ
6. เปิด AnyDesk ค้างไว้
7. กดยอมรับเมื่อเจ้าหน้าที่เชื่อมต่อ

## Flow เจ้าหน้าที่

1. เปิดคิวช่วยเหลือผ่าน AnyDesk
2. โหลดคิวงาน
3. กดรับงาน/เริ่มช่วย
4. ระบบคัดลอก AnyDesk ID ให้
5. เปิด AnyDesk และวาง ID
6. ให้ผู้ใช้กดยอมรับ
7. บันทึกผลและจบงาน

## ข้อมูลที่เก็บในระบบ

- เบอร์ผู้ขอ
- ชื่อผู้ขอและกลุ่มงานจาก profile
- AnyDesk ID
- ประเภทปัญหา
- หัวข้อและรายละเอียด
- สถานะงาน
- เจ้าหน้าที่ผู้รับงาน
- หมายเหตุและผลการช่วยเหลือ
- audit log ของแต่ละ action

## สิ่งที่ Health Assistant OS ไม่เก็บ

- รหัสผ่าน AnyDesk
- unattended access password
- ภาพหน้าจอ
- command ควบคุมเครื่อง
- ไฟล์ session ของ AnyDesk

## ไฟล์ที่เกี่ยวข้อง

- `remote.html`
  - หน้า AnyDesk Support Hub

- `index.html`
  - การ์ดเข้าโมดูลใน IT Services Hub

- `Code.gs.txt`
  - backend สำหรับสร้างงาน, โหลดคิว, อัปเดตสถานะ, audit log

- `sw.js`
  - cache version สำหรับหน้าใหม่

- `vercel.json`
  - route `/remote` ไปยัง `remote.html`

## ไฟล์ที่ไม่ใช้แล้ว

- `remote-live.html`
- `remote-relay/`
- `agent/`
- `REMOTE_SUPPORT_PHASE5.md`

ไฟล์ชุดนี้เป็นของแผน Realtime Relay/HealthAssistant Agent เดิม และถูกถอดออกแล้ว
