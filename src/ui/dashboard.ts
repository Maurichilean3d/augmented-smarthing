import { Euler } from 'three';
import { XRMobilePose, XRMobileTelemetryPacket } from '../core/types';
import { MobileObjectProfile } from '../profiles/mobileObjectProfile';

export class MobileObjectDashboard {
  private profile?: MobileObjectProfile;
  private fields = new Map<string, HTMLElement>();

  constructor(private root: HTMLElement) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-field]'))) {
      this.fields.set(el.dataset.field!, el);
    }
  }

  setProfile(profile: MobileObjectProfile): void {
    this.profile = profile;
    const title = this.root.querySelector('h1');
    if (title) title.textContent = profile.displayName;
  }

  setConnection(status: string): void {
    this.set('connection', status);
  }

  updateTelemetry(packet: XRMobileTelemetryPacket): void {
    this.set('connection', 'Conectado');
    this.set('battery', `Batería: ${(packet.battery ?? 0).toFixed(0)}%`);
    this.set('state', `Estado: ${packet.state ?? '—'}`);
    this.set('vibration', `Vibración: ${(packet.vibration ?? 0).toFixed(2)}`);
  }

  updatePose(pose: XRMobilePose): void {
    if (pose.positionValid) {
      const p = pose.worldPosition;
      this.set('position', `Posición: X ${p.x.toFixed(2)}  Y ${p.y.toFixed(2)}  Z ${p.z.toFixed(2)}`);
    }
    if (pose.rotationValid) {
      const e = new Euler().setFromQuaternion(pose.worldRotation, 'XYZ');
      this.set('rotation', `Rotación: Yaw ${radToDeg(e.y).toFixed(0)}  Pitch ${radToDeg(e.x).toFixed(0)}  Roll ${radToDeg(e.z).toFixed(0)}`);
    }
    this.set('confidence', `Confianza: ${(pose.confidence * 100).toFixed(0)}%`);
  }

  private set(key: string, value: string): void {
    const el = this.fields.get(key);
    if (el) el.textContent = value;
  }
}

function radToDeg(v: number): number {
  return v * 180 / Math.PI;
}
