# Remote Support Rollback / Cleanup Plan

สถานะปัจจุบัน: โมดูลช่วยเหลือทางไกลเปลี่ยนมาใช้ AnyDesk เป็นเครื่องมือควบคุมหน้าจอหลักแล้ว

Health Assistant OS ทำหน้าที่:

- สร้างคำขอช่วยเหลือ
- เก็บ AnyDesk ID
- แจ้งเจ้าหน้าที่
- รับงาน / เริ่มงาน / บันทึกหมายเหตุ / จบงาน
- เก็บ audit log และประวัติการช่วยเหลือ

AnyDesk ทำหน้าที่:

- ดูหน้าจอ
- ควบคุมเครื่อง
- ขอการยินยอมจากผู้ใช้ปลายทาง

## ต้อง rollback database ไหม

โดยปกติ **ไม่จำเป็นต้อง rollback database**

เหตุผล:

- `RemoteSupportSessions` ยังใช้ต่อเป็น ticket งานช่วยเหลือ AnyDesk ได้
- `RemoteSupportEvents` ยังใช้เป็น audit log ได้
- ข้อมูลเก่าไม่กระทบระบบหลัก
- การ rollback จะลบประวัติที่อาจใช้ตรวจสอบย้อนหลัง

ให้ rollback เฉพาะกรณี:

- มีข้อมูลทดสอบจำนวนมาก
- ต้องการล้างประวัติ Remote Support ทั้งหมด
- ต้องการปิดโมดูลนี้ออกจากระบบจริง ๆ

## ข้อมูลที่ยังใช้ต่อ

- `RemoteSupportSessions`
  - เก็บคำขอช่วยเหลือ, ผู้ขอ, กลุ่มงาน, AnyDesk ID, สถานะ และผู้รับงาน

- `RemoteSupportEvents`
  - เก็บ audit log เช่น created, assign, start, note, end, cancel

- `Settings.REMOTE_SUPPORT_ENABLED`
  - ใช้เปิด/ปิดโมดูล Remote Support

## ข้อมูล legacy ที่ล้างได้ถ้าต้องการ

ถ้าเคยทดสอบ Phase Realtime/Agent มาก่อน ข้อมูลเหล่านี้ไม่จำเป็นกับ AnyDesk แล้ว:

- `RemoteSupportFrames`
- `RemoteSupportSignals`
- `Settings.REMOTE_SUPPORT_RELAY_URL`
- `Settings.REMOTE_SUPPORT_RELAY_SECRET`
- notification ทดสอบประเภท `Remote Support` ที่ไม่ต้องการเก็บ

## Rollback แบบไม่ลบข้อมูล

เหมาะเมื่ออยากหยุดใช้งานชั่วคราว

1. ตั้งค่า `REMOTE_SUPPORT_ENABLED=OFF`
2. ไม่ต้องลบ sheet ใด ๆ

ผลลัพธ์:

- ผู้ใช้สร้างคำขอใหม่ไม่ได้
- ประวัติเดิมยังอยู่ครบ

## Cleanup แบบปลอดภัย

แนะนำให้ทำแบบนี้ก่อนลบจริง:

1. สำรองไฟล์ database ก่อน
2. ตรวจจำนวนแถวใน `RemoteSupportSessions` และ `RemoteSupportEvents`
3. ลบเฉพาะข้อมูลทดสอบที่มั่นใจว่าไม่ต้องใช้
4. เก็บประวัติงานจริงไว้

## Rollback แบบล้างโมดูล Remote Support ทั้งหมด

ใช้เฉพาะเมื่อต้องการยกเลิกโมดูลนี้จริง ๆ

ผลลัพธ์ที่คาดหวัง:

- ลบข้อมูลใน `RemoteSupportSessions`
- ลบข้อมูลใน `RemoteSupportEvents`
- ลบข้อมูล legacy ใน `RemoteSupportSignals`
- ลบข้อมูล legacy ใน `RemoteSupportFrames`
- ปิด `REMOTE_SUPPORT_ENABLED`

ไม่ควรแตะ:

- `Users`
- `UserProfiles`
- `Schedules`
- `ITBookings`
- `DailyReports`
- `CollaborativeWorkspaces`

## ไฟล์ legacy ที่ไม่ใช้แล้ว

ลบออกจาก workspace แล้ว:

- `remote-live.html`
- `remote-relay/`
- `agent/`
- `REMOTE_SUPPORT_PHASE5.md`

## ไฟล์ที่ยังต้อง deploy

- `index.html`
- `remote.html`
- `Code.gs.txt`
- `sw.js`
- `vercel.json`

## หมายเหตุด้านความปลอดภัย

- ไม่เก็บรหัสผ่าน AnyDesk หรือ unattended access ใน Health Assistant OS
- ผู้ใช้ต้องกดยอมรับจาก AnyDesk เองทุกครั้ง
- เจ้าหน้าที่ควรบันทึกผลการช่วยเหลือก่อนจบงาน
- หากใช้ AnyDesk ในหน่วยงาน ควรตรวจเรื่อง license ให้ถูกต้องตามการใช้งานจริง
