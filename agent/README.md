# Health Assistant Remote Agent

Portable Agent สำหรับ Remote Support Phase 2-4 MVP

## สถานะปัจจุบัน

- Phase 2: มี source สำหรับ Portable Agent แล้ว
- Phase 3: Agent ส่งภาพหน้าจอแบบ view-only ผ่าน polling ไปยัง `remote.html`
- Phase 4: เจ้าหน้าที่ส่งคำสั่ง mouse/keyboard ได้เฉพาะหลังผู้ใช้กดยินยอมควบคุม
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
6. ผู้ใช้กด `Start View-only`
7. เจ้าหน้าที่เปิด `Staff Dashboard` แล้วกด `เปิด Viewer`
8. ถ้าต้องควบคุม ให้เจ้าหน้าที่กด `ขอควบคุมเครื่อง` และผู้ใช้ต้องกด `Approve Control`

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

## Rollback

ใช้หน้า `remote.html` แท็บ `Rollback` หรือเรียก `cleanupRemoteSupportDatabaseV753`

ข้อมูลที่จะถูกล้างเมื่อ rollback:

- `RemoteSupportSessions`
- `RemoteSupportEvents`
- `RemoteSupportSignals`
- `RemoteSupportFrames`
- remote support notifications ถ้าเลือก purge
