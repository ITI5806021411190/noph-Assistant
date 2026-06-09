# Health Assistant Remote Agent

โฟลเดอร์นี้เตรียมไว้สำหรับ Portable Agent ระยะถัดไป

สถานะปัจจุบัน:

- ยังไม่มีไฟล์ `.exe` จริง
- `remote.html` ทำหน้าที่ Remote Support Hub ระยะที่ 1
- Agent flow ที่มีตอนนี้เป็น check-in scaffold:
  - กรอก session code
  - แจ้งว่า Agent พร้อม
  - บันทึก consent/view-only status
  - บันทึก audit event

## Agent ตัวจริงควรทำอะไร

1. เปิดเป็น portable `.exe` โดยไม่ต้องติดตั้ง
2. ให้ผู้ใช้กรอก session code
3. เรียก backend เพื่อ check-in session
4. แสดงชื่อเจ้าหน้าที่และคำขออนุญาต
5. เริ่มจาก view-only ก่อน
6. เพิ่ม request control ทีหลัง โดยต้องให้ผู้ใช้กดยืนยันอีกครั้ง
7. มีปุ่มหยุด session อยู่บนหน้าจอตลอดเวลา

## Backend Functions

- `getRemoteSupportSessionV752`
- `updateRemoteSupportSessionV752`

## Security Rules

- ห้าม unattended access ใน phase แรก
- ห้ามเก็บรหัสผ่าน remote แบบถาวร
- session code ต้องหมดอายุ
- ทุก action ต้องบันทึก audit log
