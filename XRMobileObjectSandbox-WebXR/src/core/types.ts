import { Quaternion, Vector3 } from 'three';

export type TrackingMode = 'Planar2D' | 'Free3D';
export type ObjectKind = 'Generic' | 'ToyVehicle' | 'Appliance' | 'Robot' | 'Tool';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface UwbRange {
  anchorId: string;
  meters: number;
  quality?: number;
}

export interface XRMobileTelemetryPacket {
  objectId: string;
  profileId?: string;
  trackingMode?: string;
  timestampMs?: number;
  ranges?: UwbRange[];
  imu?: QuaternionLike;
  accel?: Vector3Like;
  gyro?: Vector3Like;
  vibration?: number;
  battery?: number;
  speed?: number;
  state?: string;
}

export interface XRObjectCommand {
  objectId?: string;
  profileId?: string;
  command: 'start' | 'stop' | 'set_speed' | 'pulse' | 'recipe' | string;
  value?: number;
  payloadJson?: string;
  requiresHumanConfirm?: boolean;
}

export interface XRMobilePose {
  worldPosition: Vector3;
  worldRotation: Quaternion;
  mode: TrackingMode;
  positionValid: boolean;
  rotationValid: boolean;
  confidence: number;
}

export function quaternionFromPacket(q?: QuaternionLike): Quaternion {
  if (!q) return new Quaternion();
  const out = new Quaternion(q.x, q.y, q.z, q.w);
  const len = Math.hypot(out.x, out.y, out.z, out.w);
  if (!Number.isFinite(len) || len < 1e-4) return new Quaternion();
  out.x /= len;
  out.y /= len;
  out.z /= len;
  out.w /= len;
  return out;
}

export function vector3FromLike(v?: Vector3Like): Vector3 {
  return new Vector3(v?.x ?? 0, v?.y ?? 0, v?.z ?? 0);
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
