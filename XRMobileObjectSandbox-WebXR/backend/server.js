// WebXR bridge for XRMobileObjectSandbox.
// - Receives ESP32/UWB packets over UDP.
// - Broadcasts telemetry to browser clients over WebSocket.
// - Provides the same /llm and /actuator sandbox HTTP endpoints.

import dgram from 'node:dgram';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const HTTP_PORT = Number(process.env.PORT || 8787);
const UDP_PORT = Number(process.env.UDP_PORT || 7777);

let latestPacket = null;
const clients = new Set();

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function broadcastTelemetry(packet) {
  const msg = JSON.stringify({ type: 'telemetry', packet });
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.url === '/api/latest' && req.method === 'GET') {
      sendJson(res, 200, { packet: latestPacket });
      return;
    }

    if (req.url === '/telemetry' && req.method === 'POST') {
      const packet = await readJson(req);
      if (!packet.objectId) {
        sendJson(res, 400, { error: 'Telemetry packet must include objectId' });
        return;
      }
      latestPacket = packet;
      broadcastTelemetry(packet);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url === '/llm' && req.method === 'POST') {
      const body = await readJson(req);
      const answer = [
        'Modo sandbox LLM WebXR activo.',
        'Puedo acompañar la UI del perfil actual y explicar el estado.',
        'Mensaje usuario: ' + (body.message || ''),
        'Estado recibido: ' + String(body.state || '').slice(0, 900)
      ].join('\n');
      sendJson(res, 200, { answer });
      return;
    }

    if (req.url === '/actuator' && req.method === 'POST') {
      const command = await readJson(req);
      const allowed = ['stop', 'start', 'set_speed', 'pulse', 'recipe'];
      if (!allowed.includes(command.command)) {
        sendJson(res, 400, { error: 'Command not allowed in sandbox' });
        return;
      }
      sendJson(res, 200, { ok: true, simulated: true, command });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/telemetry') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'status', message: 'connected' }));
  if (latestPacket) ws.send(JSON.stringify({ type: 'telemetry', packet: latestPacket }));
  ws.on('close', () => clients.delete(ws));
});

const udp = dgram.createSocket('udp4');
udp.on('message', (message, remote) => {
  try {
    const packet = JSON.parse(message.toString('utf8'));
    if (!packet.objectId) return;
    latestPacket = packet;
    broadcastTelemetry(packet);
    if (process.env.LOG_PACKETS === '1') console.log(`[udp ${remote.address}:${remote.port}]`, packet);
  } catch (error) {
    console.warn('[XRMobile] UDP parse error:', error.message);
  }
});

udp.bind(UDP_PORT, () => {
  console.log(`XRMobile WebXR UDP bridge listening on udp://0.0.0.0:${UDP_PORT}`);
});

server.listen(HTTP_PORT, () => {
  console.log(`XRMobile WebXR backend listening on http://localhost:${HTTP_PORT}`);
  console.log(`WebSocket telemetry endpoint: ws://localhost:${HTTP_PORT}/telemetry`);
});
