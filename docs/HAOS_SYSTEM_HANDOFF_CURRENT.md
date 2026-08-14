# Health Assistant OS - System Handoff

อัปเดตเอกสาร: 10 สิงหาคม 2569  
สถานะโค้ดที่ใช้อ้างอิง: `main` / commit `cb068b1` (`v70.135`)  
Production URL: `https://noph-assistant.vercel.app/`

เอกสารนี้สรุปความสามารถ สถาปัตยกรรม ข้อมูล การ deploy การทดสอบ และข้อควรระวังของ Health Assistant OS (HAOS) เพื่อให้ผู้พัฒนาคนถัดไปรับช่วงงานได้โดยไม่ต้องไล่อ่านประวัติ patch ทั้งหมด

## 1. ภาพรวมระบบ

Health Assistant OS เริ่มจากเว็บแอปสำหรับบันทึกรายงานและตารางงานภายในสำนักงาน แล้วขยายเป็นแพลตฟอร์มงานสำนักงานที่รวมบัญชีผู้ใช้ โปรไฟล์หลายกลุ่มงาน งานและนัดหมาย บริการ IT เอกสาร การประชุม การแจ้งเตือน แบบฟอร์มออนไลน์ Dashboard และหน้าสาธารณะไว้ในระบบเดียว

ระบบปัจจุบันประกอบด้วย 4 ส่วนหลัก:

1. **HAOS Web Frontend** - Static HTML/CSS/JavaScript บน Vercel
2. **Google Apps Script Backend** - API, business logic, Google Drive/Docs/Calendar/Forms, Gemini และการเข้าถึง Google Sheets
3. **Google Sheets Database** - ฐานข้อมูลหลักของระบบสำนักงานในปัจจุบัน
4. **Firebase** - ใช้เฉพาะกิจกรรม Popular Vote เป็นหลัก ไม่ใช่ฐานข้อมูลหลักของ HAOS

มีโครง PostgreSQL/Supabase สำหรับการย้ายระบบแบบ Hybrid ในอนาคต แต่ค่าเริ่มต้นยังปิดอยู่ และยังไม่ใช่ฐานข้อมูล Production หลัก

### พัฒนาการโดยย่อจากระบบแรกถึงปัจจุบัน

| ช่วงพัฒนา | สิ่งที่เพิ่มเข้ามา |
| --- | --- |
| ระบบระยะแรก | Login/PIN, ผู้ใช้และสิทธิ์, รายงานการปฏิบัติงาน, ตารางงาน, Admin tools, Notification และ Audit Log |
| IT Services รุ่นแรก (`v41-v48`) | IT Services Hub, จองห้อง/Zoom, รายงานประชุม, AI เสียง, แบ่งไฟล์เสียง, พื้นที่ทำงานร่วมกัน และ Word Cloud |
| การเชื่อมงานสำนักงาน | ทรัพย์สิน/License, Helpdesk, e-Meeting, Public dashboards, Active Profile, Auto Login, OTP, Permission Matrix และ Backup/Restore |
| Stabilization (`v70.69-v70.87`) | เริ่มแยกโมดูลจาก `index.html`, Schedule engine, Shared Workspace core/export/flow, Public link, วันที่ไทย, งานใกล้ถึง และ audio-safe |
| AI/เอกสาร (`v70.88-v70.95`) | AI Document Summary, e-Office, User Notes และ popup safety audit |
| Help Center (`v70.96-v70.109`) | แก้ legacy renderer หลายรุ่น ก่อนสรุปเป็นหน้า Standalone และล้าง patch ที่ไม่ใช้ |
| IT Asset (`v70.111-v70.125`) | Import audit, Public asset portal, category report, change request, manager edit, date normalization, pagination และ custom category |
| Workspace AI (`v70.126`) | AI Designer Phase 1 สำหรับออกแบบพื้นที่จากข้อความ/ไฟล์ |
| Event tools (`v70.127-v70.131`) | Jigsaw และ Popular Vote แยกจาก HAOS Core |
| Dashboard Builder (`v70.132-v70.135`) | Builder, Vercel routes, Public Sharing และ Viewer UI Phase 6.1 |

ตารางนี้เป็นภาพรวมเชิงวิวัฒนาการ ไม่ใช่ release note ราย commit; รายละเอียด rollback รายรุ่นอยู่ใน `docs/ROLLBACK_*.md` และประวัติ Git

## 2. กลุ่มผู้ใช้และสิทธิ์

### ผู้ใช้งานทั่วไป (User)

- ลงทะเบียนและเข้าสู่ระบบด้วยเบอร์โทรศัพท์และ PIN
- ใช้โปรไฟล์การทำงานของตนเอง
- บันทึกรายงาน งาน นัดหมาย Note และใช้เครื่องมือที่ได้รับสิทธิ์
- ดูงานส่วนตัว งานกลุ่มงาน และการแจ้งเตือนที่เกี่ยวข้อง
- ส่งคำขอจองห้อง/Zoom แจ้งซ่อม ขอแก้ไขข้อมูลทรัพย์สิน และใช้พื้นที่ทำงานร่วมกัน

### หัวหน้ากลุ่มงาน (Head)

- ใช้ความสามารถของ User
- ดูและติดตามงาน/รายงานในกลุ่มงานตามสิทธิ์
- อนุมัติหรือจัดการรายการที่ Permission Matrix อนุญาต
- เข้าถึงข้อมูลกลุ่มงานจาก Active Profile ที่เลือก

### ผู้ดูแลระบบ (Admin)

- จัดการผู้ใช้ ทรัพยากร สถานะงาน ประเภทงาน และโมดูลที่ได้รับสิทธิ์
- จัดการคำขอจอง แจ้งซ่อม ทรัพย์สิน การประชุม และ Dashboard ตาม Permission Matrix
- ดู Audit Log, Error Log, Analytics และ System Health ตามสิทธิ์

### ผู้ดูแลระบบสูงสุด (Super Admin)

- เข้าถึงเครื่องมือผู้ดูแลและเครื่องมือระบบขั้นสูงทั้งหมด
- จัดการบัญชี โปรไฟล์ Role สิทธิ์ หน่วยงานภายนอก Branding/PWA Backup/Restore และการซ่อมฐานข้อมูล
- จัดการ Permission Matrix และการตั้งค่าการเชื่อมต่อระบบ

### สิทธิ์เฉพาะโมดูล

ระบบมีสิทธิ์เฉพาะงาน เช่น IT Asset Manager, ผู้จัดการคำขอจอง, เจ้าหน้าที่ Helpdesk, เจ้าของ Dashboard, Dashboard Editor และผู้ดูแล e-Meeting โดยตรวจทั้งฝั่งหน้าเว็บและ Google Apps Script

## 3. บัญชี ผู้ใช้ และ Active Profile

- หนึ่งบัญชีมีหลายโปรไฟล์การทำงานได้ ไม่ต้องสร้างบัญชีซ้ำ
- แต่ละโปรไฟล์ระบุกลุ่มงาน ตำแหน่ง บทบาทในกลุ่มงาน สถานะ โปรไฟล์หลัก สิทธิ์อนุมัติ ลายเซ็น และช่องทางแจ้งเตือน
- ถ้ามีโปรไฟล์เดียว ระบบเลือกให้อัตโนมัติ; ถ้ามีหลายโปรไฟล์ ผู้ใช้เลือกหรือสลับ Active Profile ได้
- สิทธิ์และข้อมูลที่มองเห็นอิงตามโปรไฟล์ที่กำลังใช้งาน
- Audit Log เก็บทั้งบัญชีและบริบทโปรไฟล์ที่ใช้ทำรายการ
- รองรับผู้สมัครจากหน่วยงานภายนอก โดย Super Admin ต้องสร้างรายชื่อหน่วยงานภายนอกที่อนุญาตก่อน
- รองรับ Invite Link, คำขอเปลี่ยน PIN และการเปิด/ปิดบัญชี

### การเข้าสู่ระบบและความปลอดภัยบัญชี

- Login ด้วยเบอร์โทรศัพท์และ PIN
- ลงทะเบียนสมาชิกโดยบังคับใช้อีเมล
- ลืม PIN ใช้เบอร์โทรศัพท์ + อีเมลที่ตรงกัน แล้วส่ง OTP ไปทางอีเมลก่อนตั้ง PIN ใหม่
- รองรับ Remember/Auto Login แบบอุปกรณ์ พร้อมดูและเพิกถอนอุปกรณ์ที่จำการเข้าสู่ระบบไว้
- การทดลองคืนหน้าทำงานล่าสุดหลัง Auto Login ถูก rollback เพราะทำให้ Login ช้าลง ไฟล์ `session-restore.js` ยังอยู่แต่ไม่ได้โหลดใน `index.html`

## 4. หน้าหลักและการนำทาง

- Hero card แสดงผู้ใช้ โปรไฟล์ กลุ่มงาน Role วันที่/เวลา สถานะระบบ และตัวเลขสรุป
- Quick Actions เช่น บันทึกรายงาน สร้างตารางงาน เปิดการแจ้งเตือน ปฏิทิน คู่มือ ศูนย์ช่วยเหลือ Executive และ Export
- แท็บหลักครอบคลุม:
  - กำหนดการวันนี้และใกล้ถึง
  - IT Services Hub
  - ตารางงาน & นัดหมาย
  - รายงานการปฏิบัติงาน
- วันที่แสดงแบบไทย เช่น `16 • มิถุนายน • 2569`
- เวลาแสดงแบบ 24 ชั่วโมง เช่น `08.30 น.` และ `23.30 น.`
- มี Program Guide หลัง Login, คู่มือ HAOS, คู่มือรายโมดูล และปุ่ม Help
- IT Services Hub รองรับจัดเรียง ปักหมุด และซ่อนโมดูลตามผู้ใช้

## 5. ตารางงาน & นัดหมาย

### การสร้างและจัดการงาน

- งานส่วนตัวและงานกลุ่มงาน
- ชื่องาน รายละเอียด สถานที่ ผู้รับผิดชอบ ประเภท Priority/Tags และสถานะ
- วันเวลาแบบช่วงเดียวหรือหลายช่วงเวลา
- AI อ่านข้อความ/เอกสารเพื่อช่วยสกัดวัน เวลา สถานที่ และหลายช่วงกำหนดการ
- งานประจำ/Recurring Rules
- ไฟล์แนบประกอบเรื่อง
- ลิงก์เข้าร่วม Zoom/Meet หลายรายการ พร้อมชื่อกำกับแบบละเอียด
- ลิงก์เอกสารประกอบหลายรายการ พร้อมชื่อกำกับ
- เลือกบันทึกข้อมูลไปยังสมุด Note เพิ่มเติมได้
- ปักหมุด แก้ไข ลบ เปลี่ยนสถานะ และอนุมัติตามสิทธิ์

### การดูข้อมูล

- มุมมองรายการ การ์ด และปฏิทิน
- กรองด้วยคำค้น สถานะ Scope กลุ่มงาน Priority Tags และช่วงวันที่
- เรียงตามวันที่ใกล้ถึง วันที่มากไปน้อย วันที่น้อยไปมาก และเกณฑ์อื่น
- แยกสีงานส่วนตัวและงานกลุ่มงาน
- เน้นงานด่วน/ด่วนมาก
- Pagination หน้าละ 20 รายการ
- Popup รายละเอียดมีคำสั่งพิมพ์ คัดลอกข้อความ โหลดรูป สร้าง QR และจัดการลิงก์สาธารณะ

### Public Link และ Google Calendar

- สร้าง ดู คัดลอก เปิด ปิด และสร้าง QR ของลิงก์ตารางงานสาธารณะ
- หน้าสาธารณะมีปุ่มกลับเข้าสู่ HAOS
- ตั้งเวลาเตือนล่วงหน้าแบบยืดหยุ่น
- Sync งานไป Google Calendar กลาง และส่ง reminder ตามค่าที่กำหนดในงาน
- หมายเหตุ: การเชื่อม Google Calendar ปัจจุบันอิงสิทธิ์ของบัญชีผู้ deploy Apps Script ไม่ใช่ OAuth ส่วนตัวของผู้ใช้ทุกคน

### งานค้างและการเตือน

- แจ้งเตือนกำหนดการวันนี้และกำหนดการใกล้ถึง
- เลือกช่วงใกล้ถึงได้ 3, 7 หรือ 15 วันในหน้าที่รองรับ
- งานที่เลยกำหนดแต่ยังอยู่ระหว่างดำเนินการจะแจ้งถามวันละครั้งว่าจะเปลี่ยนเป็นดำเนินการแล้วหรือไม่

## 6. กำหนดการวันนี้และใกล้ถึง

- รวมงานของวันนี้และงานที่ใกล้ถึงโดยไม่สร้าง Notification ซ้ำลงฐานข้อมูลทุกวัน
- คำนวณจากข้อมูล Schedules ขณะโหลดหน้า
- แสดงจำนวนบน Hero และเป็นแท็บแยกสำหรับการสแกนงานเร็ว
- เปิด Popup รายละเอียดของรายการโดยไม่จำเป็นต้องเปลี่ยนไปแท็บตารางงาน
- การนับวันใกล้ถึงใช้แนวคิด “วันเต็มที่เหลือระหว่างทาง” ตามข้อกำหนดเดิมของระบบ

## 7. Notification Center

- ศูนย์รวมแจ้งเตือนจากตารางงาน จองห้อง/Zoom แจ้งซ่อม PIN e-Meeting ทรัพย์สิน และระบบผู้ดูแล
- แยกสี ไอคอน ชื่อโมดูล วันที่ เวลา และระดับความเร่งด่วน
- เน้นรายการของวันนี้
- กรองตามคำค้น โมดูล ระดับ และสถานะอ่าน
- อ่านทั้งหมด รีเฟรช เปิดรายการ ทำเครื่องหมายอ่าน และลบ
- Pagination เมื่อเกิน 20 รายการ
- Action Router เปิดรายการต้นทางที่เกี่ยวข้อง
- มีเครื่องมือตรวจ coverage/การเชื่อมแจ้งเตือนสำหรับ Admin
- รองรับการแจ้งเตือนผ่านระบบ อีเมล และ Telegram ตามการตั้งค่า

## 8. รายงานการปฏิบัติงาน

- บันทึกรายงานประจำวันแบบปฏิบัติงานปกติ/นอกสถานที่
- แนบไฟล์ผลงาน
- ใช้ AI ช่วยเรียบเรียงข้อความ
- แก้ไขและลบรายการตามสิทธิ์
- ดูประวัติแบบรายการ การ์ด และปฏิทิน
- หัวหน้าหรือผู้มีสิทธิ์ดูภาพรวมทีม
- ส่งออกข้อมูลแบบทางการและใช้ Executive Dashboard สรุปภาพรวม

## 9. IT Services Hub

IT Services Hub เป็นศูนย์รวมโมดูลสำนักงานที่เชื่อมกับบัญชี สิทธิ์ Notification Center และ Audit Log กลาง

### 9.1 ระบบจองห้องประชุม / Zoom

- ส่งคำขอแบบสมาชิกหรือ Public Booking โดยไม่ต้อง Login
- หน้า Public Booking ถามก่อนว่าเป็นสมาชิกหรือไม่
- ผู้สมัครภายหลังส่งคำขอสามารถส่งชื่อ เบอร์ ตำแหน่ง และอีเมลไปหน้าลงทะเบียน โดยให้เลือกกลุ่มงานเอง
- รองรับประเภท Host/Join ห้องประชุม/สถานที่ ช่วงเวลา Meeting ID Passcode และลิงก์ประชุม
- เก็บเลขที่ขึ้นต้นด้วยศูนย์เป็นข้อความ เช่น Passcode `00016`
- เจ้าหน้าที่กรอกข้อมูลส่วน Admin แยกห้อง/ID/Passcode
- สถานะอนุมัติ/ไม่อนุมัติ/รอเจ้าหน้าที่
- เจ้าของขอแก้ไขหรือขอยกเลิกได้ แต่มีผลเมื่อผู้มีสิทธิ์อนุมัติ
- มุมมองตาราง การ์ด ปฏิทิน ตัวกรอง เรียงวันที่ ปักหมุด และ Pagination
- Digital Paper Form พร้อมลายเซ็นผู้ขอ ผู้ควบคุม เจ้าหน้าที่ และผู้อนุญาต
- Notification และเชื่อมตารางงาน/ปฏิทินหลังอนุมัติ
- Public link หลัก: `/public?booking=1`

### 9.2 แจ้งซ่อม IT / Helpdesk

- ผู้ใช้สร้าง Ticket พร้อมอาการ รูปภาพ ไฟล์ และทรัพย์สินที่เกี่ยวข้อง
- ดึงข้อมูลเครื่อง ผู้ใช้ สถานที่ ประกัน และ License จากทะเบียนทรัพย์สิน
- เจ้าหน้าที่รับงาน เปลี่ยนสถานะ เพิ่มอัปเดต และติดตาม SLA
- Digital View/เอกสารแจ้งซ่อม
- เชื่อม Notification Center, Audit Log และ Help Center

### 9.3 ทะเบียนทรัพย์สิน IT และ Software License

- จัดการ Hardware, Software, License และความสัมพันธ์ License กับเครื่อง
- นำเข้า Excel/XLSX โดยผู้มีสิทธิ์ Manager Mode
- ตรวจ header, ชีต, จำนวนรายการ และ mapping ก่อนนำเข้า
- ใช้รหัสครุภัณฑ์/เลข GFMIS/Serial เป็นกุญแจ matching ที่เหมาะสม ลดการรวมรายการผิด
- รองรับรายการหลักหลายร้อยรายการ Pagination หน้าละ 20
- หมวดหลัก หมวดย่อย และ custom subcategory override
- ผู้จัดการแก้หมวดย่อยที่ระบบจัดให้หรือเพิ่มหมวดย่อยใหม่เองได้
- กรองกลุ่มงาน สถานที่ติดตั้ง หมวด สถานะ และปีที่ได้มา
- Dashboard สรุปจำนวน ประเภท สถานะ และ License ใกล้หมดอายุ
- พิมพ์ ส่งออก CSV/Excel โหลดรูป และดูรายละเอียดรายรายการ
- Public IT Asset Dashboard แยกหมวดและดูรายละเอียดแบบ Read-only
- User/Head ขอแก้ไขข้อมูลได้; IT Manager/Admin/Super Admin ตรวจอนุมัติ
- IT Manager/Admin/Super Admin แก้ไขข้อมูลจริงจาก Public Portal ได้ตามสิทธิ์
- Export ข้อมูลละเอียดจำกัดสิทธิ์ Manager Mode

### 9.4 รายงานการประชุม

- สร้างรายงานจากข้อความดิบหรือไฟล์เสียง
- AI วิเคราะห์ 3 โหมด: อัตโนมัติ, สั้นกระชับ, ยาวละเอียด
- สกัดหัวข้อ สาระสำคัญ มติ งานที่ต้องทำ ผู้รับผิดชอบ และกำหนดเวลา
- ไฟล์เสียงใหญ่เกินเกณฑ์เข้าสู่การแบ่งไฟล์และคิววิเคราะห์อัตโนมัติ เพื่อลด Out of Memory
- เครื่องมือแบ่งไฟล์เสียงรองรับแบ่งตามเวลาเป็นวินาที/นาที คิวรายไฟล์ คิวทั้งหมด และล้างรายการ
- สร้าง Google Doc/PDF และ QR Code พร้อมดาวน์โหลด QR
- เปิดเอกสาร Google Docs/PDF และเชื่อมตารางงาน
- เจ้าของดู แก้ไข และลบตามสิทธิ์
- ตัวกรองและ Pagination

### 9.5 e-Meeting Manage

- สร้างและจัดการการประชุม
- วาระ ประเภทวาระ ผู้นำเสนอ รายละเอียด และมติ
- รายชื่อผู้เข้าร่วม ตอบรับ RSVP และมอบหมายผู้แทน
- เอกสารแยกตามการประชุม/วาระ
- Live View สำหรับอ่านวาระและเอกสารร่วมกัน
- งานติดตาม/Action Items และ Reminder Log
- สร้างหรือต่อยอดรายงานการประชุม
- Public RSVP และ Public Live routes ผ่าน `public.html`

### 9.6 สำรวจความคิดเห็นสด / Word Cloud

- สร้างแบบสำรวจสดและคำถาม
- เปิดลิงก์/QR ให้ผู้เข้าร่วมตอบ
- แสดงผลสดและ Word Cloud ตามความถี่
- เปิด/ปิดแบบสำรวจ ดูคำตอบ และจัดการรายการ

### 9.7 พื้นที่ทำงานร่วมกัน

- ชนิดพื้นที่: ตารางเบา, Checklist, แบบฟอร์มออนไลน์, แบบทดสอบ/Quiz, Google Sheet และ Google Form ตาม configuration ที่รองรับ
- ฟิลด์ข้อความ ข้อความยาว Dropdown Radio Checkbox รูปภาพ และฟิลด์ประกอบ
- ตัวเลือกกรอกแบบคั่น comma หรือเพิ่มทีละตัวเลือก
- Checkbox เลือกได้หลายคำตอบ
- Required field, duplicate field, reorder และ preview ก่อนสร้าง
- Quiz กำหนดคะแนน เฉลย แสดง/ไม่แสดงคะแนนและคำตอบที่ถูก และทำเครื่องหมายฟิลด์ข้อมูลประกอบที่ไม่คิดคะแนน
- Smart Flow/Section Logic: ไปข้อต่อไป ไป Section ที่กำหนด หรือส่งแบบฟอร์มตามคำตอบ
- กำหนดสิทธิ์เจ้าของ ผู้ดู ผู้แก้ไข รายบุคคล/กลุ่มงาน
- แก้ไขพื้นที่หลังสร้างได้ตามสิทธิ์
- Public form รองรับ Branding ชื่อระบบ/หน่วยงานชั่วคราว
- ดูคำตอบ กรอง ค้น จัดกลุ่ม และเปิด/ปิด Timestamp
- เพิ่มแถว แก้ไขคำตอบ และบันทึกข้อมูลร่วมกัน
- Export Excel ที่รักษาเลขศูนย์นำหน้า, PDF และรูป A4 แนวตั้ง/แนวนอน
- AI Designer Phase 1 วิเคราะห์ข้อความหรือไฟล์ แล้วเสนอชนิดพื้นที่ ชื่อ คำอธิบาย ฟิลด์ ตัวเลือก Required Quiz และคำแนะนำ Logic โดยยังไม่บันทึกจนผู้ใช้ยืนยัน
- การทดลองแยกพื้นที่ทำงานร่วมกันเป็นหน้า Standalone (`v70.110`) ถูก rollback แล้ว ปัจจุบันยังทำงานในหน้าหลัก

### 9.8 สรุปเอกสารด้วย AI

- รับ PDF, รูปภาพ PNG/JPG/WebP หรือข้อความที่วางเอง
- โหมดสรุปสั้น ละเอียด สำหรับผู้บริหาร และสำหรับผู้ปฏิบัติ
- แยกสาระสำคัญ สิ่งที่ต้องดำเนินการ กำหนดเวลา ผู้รับผิดชอบ และผู้เกี่ยวข้อง
- สกัดเลขหนังสือ วันที่ หน่วยงานต้นเรื่อง เรื่อง ประเภทเอกสาร และลิงก์ประชุมถ้าพบ
- สร้างร่างแจ้งเวียน ร่างบันทึกเสนอ และร่างข้อความ LINE
- สร้างตารางงานจากกำหนดการที่สกัดได้ โดย normalize ปี พ.ศ./ค.ศ. ก่อนบันทึก
- ส่งผลเข้า e-Office หรือสมุด Note
- สร้าง Google Doc/PDF
- เก็บประวัติ ค้น กรอง คัดลอก และลบรายการ

### 9.9 e-Office / สารบัญเอกสาร

- ลงทะเบียนเอกสารรับเข้า ส่งออก และภายใน
- เก็บเลขหนังสือ วันที่ เรื่อง หน่วยงานต้นเรื่อง ประเภท สถานะ ระดับความเร่งด่วน ผู้รับผิดชอบ กำหนดติดตาม ลิงก์ไฟล์ และหมายเหตุ
- สถานะตัวอย่าง: รอตรวจสอบ, เสนอเซ็น, ดำเนินการ, เสร็จสิ้น, ยกเลิก
- ค้นและกรองตามสถานะ ทิศทาง ประเภท และระดับ
- เพิ่ม แก้ไข ดู และลบตามสิทธิ์
- รับข้อมูลต่อจาก AI Document Summary ได้

### 9.10 สมุด Note

- Note ส่วนตัวและกลุ่มงาน
- หัวข้อ รายละเอียด Tags ไฟล์แนบหลายรายการ และลิงก์อ้างอิงหลายรายการ
- Pin, Archive/เสร็จสิ้น, แก้ไข, ลบ และเลือกหลายรายการเพื่อจัดการเร็ว
- เชื่อมที่มาจากตารางงาน เอกสาร AI หรือโมดูลอื่น
- ปุ่ม Quick Note บน Hero

### 9.11 Help Center / Live Chat

- ทำงานเป็นหน้า Standalone `help-live.html` เพื่อตัดปัญหา popup/CSS เดิมชนกัน
- Super Admin ตั้งรายชื่อผู้ติดต่อกลาง ลำดับ และสิทธิ์ Live Chat
- ผู้ใช้เปิดห้องแชทกับทีมช่วยเหลือ
- ส่งข้อความ รูปภาพ และไฟล์แนบ
- เจ้าหน้าที่รับงาน สนทนา ปิดงาน และลบแชทตามสิทธิ์
- เชื่อมผู้ใช้ กลุ่มงาน และประวัติการช่วยเหลือ
- Legacy popup หลายรุ่นถูกทำความสะอาดใน `v70.109`; อย่านำ renderer เก่ากลับมาใช้

### 9.12 ขอให้ IT ช่วยเหลือผ่าน AnyDesk

- HAOS เป็นตัวกลางเปิดคำขอ รับงาน ติดตามสถานะ และเก็บประวัติ
- ผู้ใช้ดาวน์โหลด AnyDesk ผ่านหน้าเว็บหรือไฟล์โดยตรง พร้อมคู่มือ
- มีลิงก์เฉพาะโมดูลสำหรับส่งให้ผู้ใช้
- เจ้าหน้าที่รับงานแล้วใช้ AnyDesk จริงเพื่อดู/ควบคุมเครื่อง
- HAOS ไม่เก็บรหัสผ่าน AnyDesk, ภาพหน้าจอ, control stream หรือไฟล์ session
- ระบบ Remote Agent/WebSocket ที่เคยทดลองถูกยกเลิกและลบออกแล้ว

### 9.13 เครื่องมือแบ่งไฟล์เสียง

- แบ่งไฟล์เสียงตามขนาดหรือระยะเวลา
- เลือกหน่วยวินาที/นาที
- ดาวน์โหลดไฟล์ย่อย ส่งสรุป เปิดฟอร์มรายงานประชุม หรือเข้าคิว AI รายไฟล์/ทั้งหมด
- ล้างผลลัพธ์หลังใช้งาน

## 10. Dashboard Builder

Dashboard Builder เป็นหน้า Standalone ที่ `/it-services/dashboard-builder` และใช้บัญชี HAOS เดิมผ่าน signed module session อายุจำกัด

### ความสามารถปัจจุบัน (`v70.132-v70.135`)

- สร้าง Dashboard จาก CSV, XLS, XLSX หรือ Google Sheets URL
- เลือก sheet และ header row
- ตรวจชนิดข้อมูล เปลี่ยนชื่อ และตัด column ที่ไม่ใช้
- Widget: KPI, Bar, Line, Pie/Donut, Table และ Filter
- Aggregation: sum, average, count, min, max
- ตารางมีค้นหา เรียง page size pagination และ safe CSV export
- Template เริ่มต้นและ AI เสนอ layout จาก schema + sample ขนาดเล็ก
- สิทธิ์ Private, Group, Selected Users และ Organization
- Owner/Editor/Admin แก้ไข; ผู้มีสิทธิ์ดูเปิด Viewer; Owner/Admin ลบ
- เก็บ Version และ Audit
- Import เป็น staged dataset; upload ที่ไม่สมบูรณ์ไม่แทนข้อมูลเดิม
- จำกัดไฟล์ 15 MB และ 20,000 rows

### Public Sharing (`v70.134`)

- เจ้าของ/Admin เปิดลิงก์ Read-only แบบสาธารณะได้ แต่ค่าเริ่มต้นปิด
- เลือกเฉพาะ columns ที่อนุญาตให้เผยแพร่
- PIN 4-8 หลักแบบเลือกใช้, วันหมดอายุ, เปิด/ปิด CSV export
- Revoke และ Regenerate token
- Server กรอง rows/schema/widgets ก่อนส่งข้อมูลสาธารณะ
- Rate limit การเดา PIN และบันทึก `PUBLIC_VIEW` ใน Audit
- Public route: `/dashboard/public/:token`

### Viewer Refresh (`v70.135` / Phase 6.1)

- Header แบบกระชับ, Summary strip, collapsible filters, reset filters
- Fullscreen presentation mode
- KPI/Chart/Table hierarchy ที่อ่านง่าย
- Responsive tablet/mobile และ Print-friendly

### ยังไม่ทำ

- **Phase 6.2:** Drag & drop, resize widget และ theme picker ที่ใช้ง่ายขึ้น
- Scheduled refresh
- External REST/database connector
- Direct Microsoft Access import
- Server-side PDF/image dashboard export

## 11. เครื่องมือผู้ดูแลระบบ

- จัดการผู้ใช้ PIN Role สถานะบัญชี และ Active Profiles
- จัดกลุ่มผู้ใช้ตามกลุ่มงาน ค้นและกรอง
- เพิ่ม/แก้ไขหน่วยงานภายนอกสำหรับการสมัครสมาชิก
- จัดการทรัพยากรห้องประชุม/Zoom และอุปกรณ์กลาง
- Work Status และ Work Tags
- Permission Matrix
- Help Center contact settings
- Audit Log และ Error Log
- Analytics / Executive Dashboard
- System Health และตรวจ API/Web App/Sheets ที่จำเป็น
- Notification/Email/Telegram diagnostics
- Branding/PWA
- Google Calendar Sync
- Backup/Restore
- Database Repair/Cleanup แบบ preview/dry-run ก่อนทำจริง
- สร้างข้อมูลทดสอบ Reset Demo และเครื่องมือส่งออก

## 12. หน้าสาธารณะและ Route สำคัญ

| Route | หน้าที่ |
| --- | --- |
| `/` | HAOS หลัก Login และ Application |
| `/public` | Public portal กลาง ใช้ query string เลือก module |
| `/public?booking=1` | แบบฟอร์มจองห้อง/Zoom สาธารณะ |
| `/public?publicId=...` | ตารางงาน/ข้อมูลสาธารณะที่เปิดลิงก์ไว้ |
| `/public?module=itasset-dashboard` | Public IT Asset Dashboard |
| `/public?module=itservices` | Public IT Services overview |
| `/public?module=itrepair-dashboard` | Public Helpdesk Dashboard |
| `/public?module=emeeting-rsvp&meetingId=...&token=...` | e-Meeting RSVP |
| `/public?module=emeeting-live&meetingId=...&token=...` | e-Meeting Live View |
| `/remote` | AnyDesk Remote Support Hub |
| `/help-live` | Help Center / Live Chat Standalone |
| `/it-services/dashboard-builder` | Dashboard Builder |
| `/it-services/dashboard-builder/new` | สร้าง Dashboard |
| `/it-services/dashboard-builder/view/:id` | Authenticated Dashboard Viewer |
| `/it-services/dashboard-builder/edit/:id` | Dashboard Editor |
| `/dashboard/public/:token` | Public Dashboard Viewer |
| `/jigsaw` | Jigsaw Event Game |
| `/popular-vote` | Popular Vote สำหรับผู้โหวต |
| `/popular-vote/stage` | Popular Vote Stage/Live Result |
| `/popular-vote/admin` | Popular Vote Admin |

Vercel ใช้ `cleanUrls` และ rewrites ใน `vercel.json`; ไม่มี global SPA fallback เพราะระบบเป็นหลายหน้า Static HTML ไม่ใช่ Next.js

## 13. ระบบกิจกรรมแยกจาก HAOS Core

### Jigsaw

- เกมทายภาพแบบทีม
- คำถามปัจจุบันเหลือ “ภาพนี้คืออะไร?” อย่างเดียว
- จัดการจำนวนรอบ รูปปริศนา รูปเฉลย คำตอบหลัก คำตอบทางเลือก ลำดับ และทำสำเนารอบ
- Import/Export JSON
- เก็บ configuration ใน IndexedDB ของ Browser
- หน้า Manager ป้องกันด้วย PIN 6 หลัก
- ไม่ใช้ Google Sheets หลักของ HAOS

### Popular Vote

- หน้า Vote, Stage และ Admin แยกกัน
- จัดกิจกรรม หมวด ผู้เข้าประกวด จำนวนรายชื่อ รูปภาพ สถานะ Draft/Open/Closed และ Stage mode
- QR สำหรับผู้โหวต, Live Viewer และ Result
- รูปผู้เข้าประกวดเก็บใน Firebase Storage
- คะแนน/สถานะใช้ Firebase Firestore
- มี Firestore Rules และ Storage Rules พร้อม Unit Tests บน Emulator
- Firebase project ปัจจุบัน: `haos-back-to-school-vote-2569`

ทั้งสองระบบเป็น Event tools ที่เก็บไว้ใช้ซ้ำในอนาคต การแก้ HAOS Core ไม่จำเป็นต้องรัน regression ของ Event tools ทุกครั้ง เว้นแต่แก้ไฟล์ร่วม, routing, service worker, Firebase หรือไฟล์ใน `jigsaw/`/`popular-vote/`

## 14. โครงสร้างข้อมูล Google Sheets

### กลุ่ม Core

- `Users`
- `UserProfiles`
- `Schedules`
- `DailyReports`
- `Notifications`
- `AuditLogs`
- `ErrorLogs`
- `Settings`
- `Resources`
- `Attachments`
- `ApprovalHistory`
- `RecurringRules`
- `WorkStatuses`
- `WorkTags`

### บัญชีและความปลอดภัย

- `PasswordResetOtp`
- `AutoLoginDevices`
- `PinChangeRequests`
- `InviteLinks`
- `PermissionMatrix`

### IT Services

- `ITBookings`
- `ITBookingChangeRequests`
- `ITAssets`
- `ITSoftware`
- `ITLicenses`
- `ITAssetSoftwareMap`
- `ITAssetChangeRequests`
- `ITAssetCategoryOverrides`
- `ITRepairTickets`
- `ITRepairUpdates`
- `ITRepairDocuments`
- `MeetingMinutes`
- `BackupLogs`

### Collaboration และเอกสาร

- `CollaborativeWorkspaces`
- `LiveOpinionSurveys`
- `LiveOpinionResponses`
- `AIDocumentSummaries`
- `EOfficeDocuments`
- `UserNotes`

### e-Meeting

- `EMeetingMaster`
- `EMeetingAgenda`
- `EMeetingParticipants`
- `EMeetingDocuments`
- `EMeetingActionItems`
- `EMeetingLiveState`
- `EMeetingReminderLog`

### Help Center

- `HelpSupportContacts`
- `HelpChatSessions`
- `HelpChatMessages`

### Dashboard Builder

- `DashboardProjects`
- `DashboardDatasets`
- `DashboardDataChunks`
- `DashboardVersions`
- `DashboardAudit`
- `DashboardPublicLinks`

หมายเหตุ: รายการนี้อ้างอิง source ปัจจุบันและ workbook inventory วันที่ 11 มิถุนายน 2569 จำนวนแถวจริงใน Production อาจเปลี่ยนแล้ว ห้ามใช้ตัวเลข row count จาก inventory เก่าเป็นค่าปัจจุบัน

## 15. สถาปัตยกรรมและไฟล์สำคัญ

### Frontend

| ไฟล์/โฟลเดอร์ | หน้าที่ |
| --- | --- |
| `index.html` | Application หลักและ legacy inline patches จำนวนมาก |
| `public.html` | Public portal หลาย module |
| `remote.html` | AnyDesk support hub |
| `help-live.html` | Standalone Help Center/Live Chat |
| `dashboard-builder.html` | Dashboard Builder authenticated app |
| `dashboard-public.html` | Public Dashboard Viewer |
| `assets/js/modules/` | โมดูลที่ทยอยแยกจาก index |
| `assets/js/dashboard-builder/` | Dashboard Builder app/renderer/connectors/viewers |
| `assets/css/` | Style แยกตามโมดูล |
| `sw.js` | Service Worker และ static cache |
| `manifest.json` | PWA metadata |
| `vercel.json` | Static routes/rewrites |

### Backend

| ไฟล์ | หน้าที่ |
| --- | --- |
| `Code.gs.txt` | Google Apps Script backend หลัก |
| `appsscript.json` | Apps Script scopes/runtime/web app config |
| `api/gas.js` | Vercel bridge จาก browser ไป Apps Script |
| `api/share.js` | Public share bridge |
| `api/_haos_postgres.js` | PostgreSQL helper สำหรับ Hybrid migration |

### ขนาด source ปัจจุบัน

- `index.html`: ประมาณ 19,408 บรรทัด / 1.75 MB
- `Code.gs.txt`: ประมาณ 16,481 บรรทัด / 0.99 MB
- `public.html`: ประมาณ 2,624 บรรทัด / 0.30 MB

ไฟล์หลักยังใหญ่และมี patch หลายรุ่น ผู้พัฒนาคนถัดไปควรแก้แบบ incremental และคง compatibility ของ `window.*`/API function เดิม จนกว่าจะมี test ครอบคลุม

## 16. การเชื่อมต่อภายนอก

- Google Sheets - ฐานข้อมูลหลัก
- Google Drive - อัปโหลดไฟล์ ลายเซ็น เอกสาร และไฟล์สรุป
- Google Docs - สร้างรายงาน/เอกสารทางการ
- Google Calendar - Sync ตารางงานและรายการอนุมัติ
- Google Forms/Sheets - พื้นที่ทำงานบางชนิด
- Gemini API - สรุป/วิเคราะห์เอกสาร เสียง รายงานประชุม และ AI Designer
- Gmail/Apps Script Mail - OTP และอีเมลแจ้งเตือน
- Telegram Bot - ช่องทางแจ้งเตือนเสริม
- Firebase Firestore/Storage - Popular Vote เท่านั้น
- AnyDesk - Remote control จริง; HAOS จัดการ workflow เท่านั้น
- PostgreSQL/Supabase - migration scaffold ยังปิดด้วย feature flags

## 17. การ Deploy

### GitHub/Vercel

- Repo: `D:\Work Public Health Office\Google app script\Health Assistant OS (On Github)\noph-Assistant`
- Production branch: `main`
- ระบบเป็น Static Web App ไม่มี production build command
- Vercel Root Directory ต้องเป็นราก repo นี้
- Output คือไฟล์ static จากราก repo ไม่ใช่ `dist/`
- หลังแก้ไฟล์เว็บ: commit, push `main`, รอ Vercel Ready แล้ว Hard Refresh/InPrivate
- ถ้าเพิ่ม asset ใหม่ที่ต้อง offline/cache ให้เพิ่มใน `sw.js` และ bump cache name

### Google Apps Script

- คัดลอก `Code.gs.txt` ไป Google Apps Script
- ตรวจ syntax ก่อน deploy
- Deploy เป็น Web App version ใหม่เมื่อมี backend/API/Sheet changes
- Frontend-only change ไม่ต้อง deploy GAS
- GAS Properties สำคัญ: `GEMINI_API_KEY`, `BOT_TOKEN`, `VERCEL_API_SECRET`, `PUBLIC_APP_BASE_URL`
- Vercel Environment Variables สำคัญ: `GAS_WEB_APP_URL`, `GAS_API_SECRET`
- `GAS_API_SECRET` และ `VERCEL_API_SECRET` ต้องตรงกัน

### Firebase

- Deploy เฉพาะเมื่อแก้ Popular Vote rules/indexes/storage
- ใช้ Emulator test ก่อน deploy
- ห้าม deploy Firebase เพราะแก้ HAOS Core/Jigsaw/Dashboard Builder ที่ไม่แตะ Firebase

## 18. คำสั่งทดสอบที่มีอยู่

Package manager ตาม lockfile: `pnpm`

```powershell
pnpm install
pnpm run test:dashboard-builder
pnpm run test:jigsaw:manager
pnpm run test:popular-vote:admin
pnpm run test:popular-vote:rules
pnpm run test:popular-vote:storage-rules
pnpm run test:popular-vote
```

การตรวจ `Code.gs.txt`:

```powershell
Copy-Item Code.gs.txt $env:TEMP\haos-codegs-check.js -Force
node --check $env:TEMP\haos-codegs-check.js
Remove-Item $env:TEMP\haos-codegs-check.js
```

ก่อน release ควรทดสอบอย่างน้อย:

1. Login, Register, Active Profile และ OTP reset
2. เปิดทุกแท็บหลัก
3. Create/Edit/View/Delete ของโมดูลที่แก้
4. Notification action ของโมดูลนั้น
5. สิทธิ์ User/Head/Admin/Super Admin
6. Public route และ Refresh/direct URL
7. Mobile/tablet/desktop
8. Console และ Network errors
9. Apps Script syntax และ bridge whitelist

## 19. Rollback และกฎการเปลี่ยนแปลง

- มี rollback docs หลายรุ่นใน `docs/ROLLBACK_*.md`
- ทุก feature ใหม่ที่แตะหลายไฟล์, GAS หรือ Sheet ควรมี rollback document
- แยก Frontend rollback, Apps Script rollback และ Database rollback
- ห้ามลบข้อมูล Production ระหว่าง refactor
- Database cleanup ต้อง Backup + Dry-run + Preview + Audit ก่อน Apply
- ห้ามลบ `Users`, `UserProfiles`, `Schedules`, `Notifications`, `AuditLogs`, `DailyReports` หรือ sheet ของโมดูลที่ใช้งานโดยไม่มี dated backup
- Frontend และ GAS deploy แยกกันได้เมื่อ compatibility ชัดเจน
- อย่าลบ global function/API เดิมก่อนยืนยันว่า callers เก่าหมดแล้ว

## 20. ความเสี่ยงและหนี้ทางเทคนิคที่ต้องรับรู้

### ความเสี่ยงสูง

1. **Secret ใน source control** - `Code.gs.txt` มี fallback bridge secret แบบ literal และ `.generated_secret.txt` ถูก track ใน Git ควร rotate secret, ย้ายไป Script Properties/Vercel Environment และลบไฟล์ secret ออกจาก Git history อย่างมีแผน
2. **ไฟล์หลักใหญ่มาก** - `index.html` และ `Code.gs.txt` มี patch ซ้อนหลายรุ่น เสี่ยง duplicate functions, handler override, popup/z-index และ render loop
3. **Apps Script execute as deployer + anonymous web app** - API bridge/allowlist/session verification ต้องถือเป็น security boundary สำคัญ
4. **Google Sheets scaling** - เหมาะกับขนาดปัจจุบันแต่ต้องระวัง `getDataRange()`, repeated reads, large JSON cells และ concurrent writes

### ความเสี่ยงปานกลาง

- `package.json` ระบุ version `70.35.0` แต่ release ปัจจุบันคือ `v70.135`; ควรจัด version source of truth ให้ตรงกัน
- เอกสารบางไฟล์มีข้อความ encoding เพี้ยนจากประวัติการแก้บน Windows; ควรรักษา UTF-8
- `session-restore.js` เป็นไฟล์ที่ไม่โหลดแล้ว ควรจัดเป็น legacy candidate แต่ยังไม่ควรลบจนตรวจ callers และ rollback docs
- `public.html` และ `index.html` ยังมี implementation หลาย generation ที่ override กัน ต้อง audit ก่อน refactor
- PostgreSQL migration flags ปิดอยู่ อย่าเปิด `HAOS_POSTGRES_*` โดยไม่ทำ migration/reconciliation plan
- Google Calendar ปัจจุบันไม่ใช่ per-user OAuth

## 21. ลำดับพัฒนาต่อที่แนะนำ

1. ทำ Dashboard Builder **Phase 6.2**: drag/drop, resize และ theme picker โดยคง config compatibility และเขียน rollback
2. ทำ source audit ปัจจุบันใหม่ เพราะ audit ล่าสุดเก่ากว่า Dashboard/Event/Asset changes
3. แยก utility กลาง: GAS client, auth/session, formatter, modal stack และ event binding
4. แยก Admin Users/System Tools ออกจาก `index.html`
5. ทำ backend service layer สำหรับ User/Profile/Notification/Schedule ก่อนโมดูลใหญ่
6. เพิ่ม automated smoke tests สำหรับ Login, Schedule, Notification, Shared Workspace, IT Booking และ IT Asset
7. Rotate/remove secrets จาก repo
8. วาง tenant model, licensing, PDPA และ backup per customer ก่อนขายรายเดือนหลายสำนักงาน
9. ประเมิน Hybrid PostgreSQL เฉพาะ read-heavy modules โดยคง Google Sheets fallback ช่วงเปลี่ยนผ่าน

## 22. Checklist ส่งมอบให้นักพัฒนาคนถัดไป

- [ ] Clone repo และ checkout `main`
- [ ] อ่านเอกสารนี้และ `docs/STABILIZATION_MODULAR_REFACTOR.md`
- [ ] อ่าน rollback doc ของโมดูลก่อนแก้
- [ ] ขอสิทธิ์ GitHub, Vercel, Google Apps Script, Google Sheet, Firebase และ Script Properties แยกจาก source code
- [ ] ตั้งค่า local `.env` จาก `.env.example` โดยไม่ commit secret
- [ ] รัน tests ที่เกี่ยวข้องก่อนแก้
- [ ] ตรวจ live sheet headers ก่อนเปลี่ยน backend schema
- [ ] ทำ change แบบเล็ก วัดผล และมี rollback
- [ ] ทดสอบตาม Role และ Public route
- [ ] อัปเดตเอกสารนี้เมื่อมี module/route/sheet ใหม่

## 23. เอกสารอ้างอิงใน Repo

- `docs/STABILIZATION_MODULAR_REFACTOR.md`
- `docs/MODULE_EXTRACTION_MANIFEST.md`
- `docs/DASHBOARD_BUILDER_MVP.md`
- `docs/DASHBOARD_BUILDER_PUBLIC_SHARING.md`
- `docs/DASHBOARD_BUILDER_VIEWER_REFRESH.md`
- `docs/REMOTE_SUPPORT_ANYDESK.md`
- `database/README.md`
- `database/docs/sheet-inventory-2026-06-11.md`
- `docs/popular-vote/CONFIGURE.md`
- `docs/popular-vote/SECURITY.md`
- `docs/jigsaw/INSTALL.md`
- `docs/ROLLBACK_*.md`

---

เอกสารนี้อธิบายความสามารถจาก source ที่ checkout ณ วันที่ระบุ ไม่ใช่การยืนยันจำนวนข้อมูลจริงหรือค่าคอนฟิกใน Production การตรวจ Production ต้องเทียบ Vercel deployment, Apps Script deployment version, Script Properties และ Google Sheet ล่าสุดร่วมกันเสมอ
