import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const RELAY_SECRET = String(process.env.RELAY_SECRET || '').trim();
const MAX_FRAME_CHARS = Number(process.env.MAX_FRAME_CHARS || 260000);
const rooms = new Map();

function roomFor(code) {
  const key = String(code || '').replace(/\D/g, '').slice(0, 6);
  if (!key) return null;
  if (!rooms.has(key)) rooms.set(key, { code: key, agent: null, staffs: new Set(), lastFrame: null, lastSeen: Date.now() });
  return rooms.get(key);
}

function send(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcast(set, payload) {
  for (const ws of set || []) send(ws, payload);
}

function safeJson(text) {
  try { return JSON.parse(String(text || '{}')); } catch (_err) { return {}; }
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if ((!room.agent || room.agent.readyState !== WebSocket.OPEN) && room.staffs.size === 0 && now - room.lastSeen > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, version: 'haos-remote-relay-v1' }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Health Assistant Remote Relay is running. Use /ws?role=agent|staff&code=123456');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_FRAME_CHARS + 4096 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/ws', 'http://localhost');
  const code = url.searchParams.get('code') || '';
  const role = String(url.searchParams.get('role') || '').toLowerCase();
  const token = url.searchParams.get('token') || '';
  const room = roomFor(code);

  if (!room || !['agent', 'staff'].includes(role)) {
    ws.close(1008, 'invalid code or role');
    return;
  }
  if (RELAY_SECRET && token !== RELAY_SECRET) {
    ws.close(1008, 'invalid token');
    return;
  }

  ws.haosRole = role;
  ws.haosCode = room.code;
  ws.haosId = Math.random().toString(36).slice(2, 10);
  room.lastSeen = Date.now();

  if (role === 'agent') {
    if (room.agent && room.agent.readyState === WebSocket.OPEN) {
      room.agent.close(1012, 'agent replaced');
    }
    room.agent = ws;
    broadcast(room.staffs, { type: 'agentStatus', connected: true, at: new Date().toISOString() });
  } else {
    room.staffs.add(ws);
    send(ws, { type: 'relayReady', code: room.code, hasAgent: !!(room.agent && room.agent.readyState === WebSocket.OPEN) });
    if (room.lastFrame) send(ws, room.lastFrame);
  }

  ws.on('message', (raw) => {
    room.lastSeen = Date.now();
    if (raw.length > MAX_FRAME_CHARS + 4096) {
      send(ws, { type: 'error', message: 'payload too large' });
      return;
    }
    const msg = safeJson(raw.toString());
    if (!msg.type) return;

    if (role === 'agent') {
      if (msg.type === 'frame') {
        const image = String(msg.image || '');
        if (image.length > MAX_FRAME_CHARS) {
          send(ws, { type: 'error', message: 'frame too large' });
          return;
        }
        room.lastFrame = {
          type: 'frame',
          image,
          width: Number(msg.width || 0),
          height: Number(msg.height || 0),
          screenWidth: Number(msg.screenWidth || 0),
          screenHeight: Number(msg.screenHeight || 0),
          capturedAt: msg.capturedAt || new Date().toISOString()
        };
        broadcast(room.staffs, room.lastFrame);
        return;
      }
      if (msg.type === 'controlConsent' || msg.type === 'status' || msg.type === 'commandAck') {
        broadcast(room.staffs, { ...msg, at: new Date().toISOString() });
      }
      return;
    }

    if (role === 'staff') {
      if (!room.agent || room.agent.readyState !== WebSocket.OPEN) {
        send(ws, { type: 'error', message: 'agent is not connected' });
        return;
      }
      if (msg.type === 'requestControl') {
        send(room.agent, { type: 'requestControl', requestedBy: msg.requestedBy || '', message: msg.message || '' });
        return;
      }
      if (msg.type === 'stopControl') {
        send(room.agent, { type: 'stopControl' });
        broadcast(room.staffs, { type: 'controlConsent', approved: false, reason: 'stopped-by-staff' });
        return;
      }
      if (msg.type === 'command') {
        send(room.agent, { type: 'command', command: msg.command || {} });
      }
    }
  });

  ws.on('close', () => {
    if (role === 'agent' && room.agent === ws) {
      room.agent = null;
      broadcast(room.staffs, { type: 'agentStatus', connected: false, at: new Date().toISOString() });
    }
    if (role === 'staff') room.staffs.delete(ws);
  });
});

setInterval(() => {
  cleanupRooms();
  for (const room of rooms.values()) {
    if (room.agent && room.agent.readyState === WebSocket.OPEN) {
      send(room.agent, { type: 'ping', at: new Date().toISOString() });
    }
    broadcast(room.staffs, { type: 'ping', at: new Date().toISOString() });
  }
}, 15000);

server.listen(PORT, () => {
  console.log(`Health Assistant Remote Relay listening on :${PORT}`);
});
