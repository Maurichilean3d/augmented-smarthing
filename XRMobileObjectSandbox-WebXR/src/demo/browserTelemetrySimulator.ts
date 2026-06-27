import { Object3D, Quaternion, Vector3 } from 'three';
import { XRMobileTelemetryPacket } from '../core/types';

export class BrowserTelemetrySimulator {
  sendHz = 30;
  objectId = 'sandbox_object_001';
  profileId = 'hotwheels';
  trackingMode: 'Planar2D' | 'Free3D' = 'Free3D';
  center = new Vector3(0, 0.8, -1.2);
  radius = new Vector3(0.45, 0.28, 0.45);
  angularSpeed = 1;
  noiseMeters = 0.01;
  private timer?: number;
  private startMs = performance.now();

  constructor(private anchors: { id: string; object: Object3D }[], private onPacket: (packet: XRMobileTelemetryPacket) => void) {}

  start(): void {
    this.stop();
    this.timer = window.setInterval(() => this.tick(), 1000 / this.sendHz);
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private tick(): void {
    const t = (performance.now() - this.startMs) / 1000 * this.angularSpeed;
    const pos = this.center.clone().add(new Vector3(Math.sin(t) * this.radius.x, Math.sin(t * 0.7) * this.radius.y, Math.cos(t) * this.radius.z));
    const rot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), t);

    const ranges = this.anchors.map((anchor) => {
      const anchorWorld = new Vector3();
      anchor.object.getWorldPosition(anchorWorld);
      const meters = Math.max(0.05, pos.distanceTo(anchorWorld) + randomNoise(this.noiseMeters));
      return { anchorId: anchor.id, meters, quality: 1 };
    });

    this.onPacket({
      objectId: this.objectId,
      profileId: this.profileId,
      trackingMode: this.trackingMode,
      timestampMs: Date.now(),
      ranges,
      imu: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
      accel: { x: 0, y: 0, z: 9.81 },
      gyro: { x: 0, y: 0, z: 0 },
      vibration: Math.abs(Math.sin(t * 4)) * 0.4,
      battery: 87,
      speed: Math.abs(Math.sin(t)) * 3,
      state: 'browser-demo'
    });
  }
}

function randomNoise(amount: number): number {
  return (Math.random() * 2 - 1) * amount;
}
