# Health Assistant Remote Relay

Realtime relay สำหรับ Remote Support Phase 5

## ทำไมต้องมี relay

Phase 2-4 ส่งภาพและคำสั่งผ่าน Apps Script / Google Sheet polling จึงหน่วงโดยธรรมชาติ
Phase 5 แยกภาพหน้าจอและคำสั่งควบคุมมาใช้ WebSocket relay แทน:

- Google Sheet: session, permission, audit, rollback
- Remote Relay: live frame และ remote command แบบ realtime

## Local Test

```powershell
cd remote-relay
npm install
npm start
```

Relay จะอยู่ที่:

```text
ws://localhost:8787/ws
```

Health check:

```text
http://localhost:8787/health
```

## Production Deploy

ใช้บริการที่รองรับ WebSocket long-lived connection เช่น:

- Google Cloud Run
- Render
- Railway
- Fly.io
- VPS / server ในสำนักงาน

ตั้งค่า environment:

```text
PORT=8787
RELAY_SECRET=optional-shared-secret
MAX_FRAME_CHARS=260000
```

เมื่อ deploy แล้วให้ตั้งค่าใน Apps Script setting:

```text
REMOTE_SUPPORT_RELAY_URL=wss://your-relay-domain/ws
REMOTE_SUPPORT_RELAY_SECRET=optional-shared-secret
```

## Protocol

Agent:

```text
wss://relay/ws?role=agent&code=123456&token=...
```

Staff:

```text
wss://relay/ws?role=staff&code=123456&token=...
```

Message หลัก:

- `frame`: Agent -> Staff
- `requestControl`: Staff -> Agent
- `controlConsent`: Agent -> Staff
- `command`: Staff -> Agent
- `commandAck`: Agent -> Staff

## Security

- ไม่มี unattended access
- Relay ไม่เก็บไฟล์ถาวร เก็บเฉพาะเฟรมล่าสุดใน memory
- ถ้าใช้ public relay ควรตั้ง `RELAY_SECRET`
- คำขอควบคุมยังต้องให้ผู้ใช้กดยินยอมที่ Agent
