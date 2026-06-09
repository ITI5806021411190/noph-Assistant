# Health Assistant Remote Agent

Portable Agent สำหรับ Remote Support Phase 2-4 MVP

## สถานะปัจจุบัน

- Phase 2: มี source สำหรับ Portable Agent แล้ว
- Phase 3: Agent ส่งภาพหน้าจอแบบ view-only ได้ 2 โหมด
  - Realtime WebSocket relay สำหรับใช้งานจริง
  - Google Sheet polling fallback เมื่อยังไม่ได้ตั้ง relay
- Phase 4: เจ้าหน้าที่ส่งคำสั่ง mouse/keyboard ผ่าน relay ได้เฉพาะหลังผู้ใช้กดยินยอมควบคุม
- ยังไม่มี unattended access และไม่ควรเปิดใช้ unattended access ในช่วงแรก

## ไฟล์ในโฟลเดอร์นี้

- `health_assistant_remote_agent.py` source ของ Agent
- `requirements.txt` dependency สำหรับ screenshot/control/build exe
- `build_portable.ps1` build เป็น `dist/HealthAssistantRemoteAgent.exe`
- `dist/HealthAssistantRemoteAgent.exe` ไฟล์ portable ที่ build แล้วสำหรับเริ่มทดสอบ

## วิธีทดสอบแบบ source

1. เปิด PowerShell ในโฟลเดอร์ `agent`
2. ติดตั้ง dependency:

```powershell
python -m pip install -r requirements.txt
```

3. รัน Agent:

```powershell
python health_assistant_remote_agent.py
```

4. เปิด `remote.html` แล้วสร้าง Session Code
5. ใส่ Session Code ใน Agent แล้วกด `Connect`
6. ถ้าระบบตั้งค่า Relay URL แล้ว Agent จะเติมช่อง Realtime Relay URL ให้อัตโนมัติ
7. ผู้ใช้กด `Start View-only`
8. เจ้าหน้าที่เปิด `Staff Dashboard` แล้วกด `Realtime`
9. ถ้ายังไม่ได้ตั้ง relay ให้ใช้ `Fallback Viewer` ชั่วคราว
10. ถ้าต้องควบคุม ให้เจ้าหน้าที่กด `ขอควบคุมเครื่อง` และผู้ใช้ต้องกด `Approve Control`

## วิธี build portable `.exe`

```powershell
.\build_portable.ps1
```

ไฟล์จะอยู่ที่:

```text
agent\dist\HealthAssistantRemoteAgent.exe
```

## Security Rules

- ห้าม unattended access
- ผู้ใช้ปลายทางต้องกดยินยอม view-only และ remote control เองทุก session
- คำสั่งควบคุมถูกจำกัดเฉพาะ click, key, type text, scroll และ hotkey allowlist ฝั่งระบบ
- ทุก action สำคัญถูกบันทึกใน `RemoteSupportEvents`
- ถ้าต้องหยุดฉุกเฉิน ให้ปิด Agent หรือเลื่อนเมาส์ไปมุมหน้าจอเพื่อ trigger pyautogui failsafe

## Realtime Relay

ถ้าต้องการให้ลื่นแบบโปรแกรม remote desktop จริง ต้อง deploy `remote-relay`
แล้วตั้งค่าในระบบ:

```text
REMOTE_SUPPORT_RELAY_URL=wss://your-relay-domain/ws
REMOTE_SUPPORT_RELAY_SECRET=optional-shared-secret
```

เมื่อ Agent กด `Connect` ระบบจะดึงค่า relay มาเอง และเมื่อผู้ใช้กด `Start View-only`
Agent จะส่งภาพผ่าน WebSocket แทน Google Sheet polling

## Rollback

ใช้หน้า `remote.html` แท็บ `Rollback` หรือเรียก `cleanupRemoteSupportDatabaseV753`

ข้อมูลที่จะถูกล้างเมื่อ rollback:

- `RemoteSupportSessions`
- `RemoteSupportEvents`
- `RemoteSupportSignals`
- `RemoteSupportFrames`
- remote support notifications ถ้าเลือก purge
