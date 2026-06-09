# Remote Support Rollback Plan

แผนนี้ใช้สำหรับถอดหรือปิดโมดูลช่วยเหลือทางไกลแบบ Portable Agent โดยไม่กระทบระบบหลักของ Health Assistant OS

## สิ่งที่เพิ่มเข้าระบบ

- `remote.html`
  - หน้า Remote Support Hub แยกจาก `index.html`
  - ใช้สำหรับสร้าง session, staff dashboard, agent check-in และ rollback

- `RemoteSupportSessions`
  - เก็บ session code, ผู้ขอรับบริการ, สถานะ, consent, agent version และ audit metadata

- `RemoteSupportEvents`
  - เก็บ audit log รายเหตุการณ์ของ remote session

- `RemoteSupportSignals`
  - เตรียมไว้สำหรับ signaling ระหว่างเว็บกับ Portable Agent ใน phase ถัดไป

- `Settings.REMOTE_SUPPORT_ENABLED`
  - ใช้เปิด/ปิดโมดูลทันที

- `Notifications`
  - อาจมีรายการประเภท `Remote Support` หรือ module `remoteSupport`

## Rollback แบบไม่ลบข้อมูล

เหมาะเมื่ออยากหยุดใช้งานชั่วคราว

1. เปิด `remote.html`
2. ไปแท็บ `Rollback`
3. กรอกเบอร์ Super Admin
4. กด `ปิดโมดูลอย่างเดียว`

ผลลัพธ์:

- ระบบตั้งค่า `REMOTE_SUPPORT_ENABLED=OFF`
- ผู้ใช้สร้าง session ใหม่ไม่ได้
- ข้อมูลเดิมยังอยู่ครบ

## Rollback แบบล้างข้อมูล แต่เก็บหัวตาราง

เหมาะเมื่อต้องการเคลียร์ database ให้สะอาด แต่ยังเผื่อเปิดใช้ใหม่

1. เปิด `remote.html`
2. ไปแท็บ `Rollback`
3. เลือก `ล้างข้อมูล แต่เก็บหัวตาราง`
4. เลือกว่าจะลบ `remote notifications` หรือไม่
5. กด `Dry Run` เพื่อตรวจจำนวนแถวก่อน
6. พิมพ์ `ROLLBACK_REMOTE_SUPPORT`
7. กด `Apply Rollback`

ผลลัพธ์:

- ลบข้อมูลใน `RemoteSupportSessions`
- ลบข้อมูลใน `RemoteSupportEvents`
- ลบข้อมูลใน `RemoteSupportSignals`
- เก็บ header ของ sheet ไว้
- ปิดโมดูลหลัง rollback โดยค่าเริ่มต้น

## Rollback แบบลบ sheet ทั้งชุด

เหมาะเมื่อตัดสินใจยกเลิกโมดูลนี้จริงๆ

1. เปิด `remote.html`
2. ไปแท็บ `Rollback`
3. เลือก `ลบ sheet remote ทั้งชุด`
4. กด `Dry Run`
5. พิมพ์ `ROLLBACK_REMOTE_SUPPORT`
6. กด `Apply Rollback`

ผลลัพธ์:

- ลบ sheet `RemoteSupportSessions`
- ลบ sheet `RemoteSupportEvents`
- ลบ sheet `RemoteSupportSignals`
- ปิดโมดูลหลัง rollback
- ไม่แตะ `Users`, `Schedules`, `ITBookings`, `DailyReports`, `CollaborativeWorkspaces`

## ฟังก์ชัน Apps Script ที่เกี่ยวข้อง

- `getRemoteSupportConfigV752`
- `setRemoteSupportEnabledV752`
- `createRemoteSupportSessionV752`
- `getRemoteSupportSessionV752`
- `getRemoteSupportSessionsV752`
- `updateRemoteSupportSessionV752`
- `cleanupRemoteSupportDatabaseV752`
- `bridgeWhitelistHealthCheckV752`

## หมายเหตุด้านความปลอดภัย

- Phase 1 ยังไม่ควบคุมเครื่องจริง
- Portable Agent ตัวจริงต้องให้ผู้ใช้กดยินยอมทุกครั้ง
- ไม่ควรเปิด unattended access ในช่วงแรก
- ควรเก็บ audit log ทุกครั้งที่เริ่ม ดูหน้าจอ ขอควบคุม และจบ session
