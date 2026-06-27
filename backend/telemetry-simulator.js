// Node UDP simulator. Run in another terminal with: npm run sim:udp

import dgram from 'node:dgram';

const HOST = process.env.BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.UDP_PORT || 7777);
const client = dgram.createSocket('udp4');
const anchors = [
  ['A', { x: -1, y: 0, z: -1 }],
  ['B', { x:  1, y: 0, z: -1 }],
  ['C', { x: -1, y: 0, z:  1 }],
  ['D', { x:  1, y: 0.9, z: 1 }]
];

let start = Date.now();

function tick() {
  const t = (Date.now() - start) / 1000;
  const pos = {
    x: Math.sin(t) * 0.45,
    y: 0.8 + Math.sin(t * 0.7) * 0.28,
    z: -1.2 + Math.cos(t) * 0.45
  };
  const halfYaw = t * 0.5;
  const packet = {
    objectId: 'sandbox_object_001',
    profileId: 'hotwheels',
    trackingMode: 'Free3D',
    timestampMs: Date.now(),
    ranges: anchors.map(([anchorId, a]) => ({
      anchorId,
      meters: Math.max(0.05, distance(pos, a) + noise(0.01)),
      quality: 1
    })),
    imu: { x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) },
    accel: { x: 0, y: 0, z: 9.81 },
    gyro: { x: 0, y: 0, z: 0 },
    vibration: Math.abs(Math.sin(t * 4)) * 0.4,
    battery: 87,
    speed: Math.abs(Math.sin(t)) * 3,
    state: 'node-udp-demo'
  };
  const msg = Buffer.from(JSON.stringify(packet));
  client.send(msg, PORT, HOST);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function noise(amount) {
  return (Math.random() * 2 - 1) * amount;
}

console.log(`Sending UDP telemetry to ${HOST}:${PORT}`);
setInterval(tick, 33);
