import { Euler } from 'three';
import { XRMobilePose, XRMobileTelemetryPacket } from '../core/types';
import { MobileObjectProfile } from '../profiles/mobileObjectProfile';

export class LLMContextBuilder {
  latestTelemetry?: XRMobileTelemetryPacket;
  latestPose?: XRMobilePose;
  extraUserContext = '';

  constructor(public profile?: MobileObjectProfile) {}

  setProfile(profile: MobileObjectProfile): void {
    this.profile = profile;
  }

  updateTelemetry(packet: XRMobileTelemetryPacket): void {
    this.latestTelemetry = packet;
  }

  updatePose(pose: XRMobilePose): void {
    this.latestPose = pose;
  }

  buildSystemPrompt(): string {
    return [
      this.profile?.llmPersona ?? 'Eres un asistente para un objeto móvil XR.',
      'Reglas: explica el estado del objeto, sugiere acciones de UI y nunca ejecutes acciones sin confirmación humana.',
      'No asumas hardware inseguro. Si el objeto es un electrodoméstico, pide confirmación y valida estados de seguridad.'
    ].join('\n');
  }

  buildStateJsonLikeBlock(): string {
    const p = this.latestPose?.worldPosition;
    const e = this.latestPose ? new Euler().setFromQuaternion(this.latestPose.worldRotation, 'XYZ') : undefined;
    return JSON.stringify({
      objectId: this.latestTelemetry?.objectId,
      profileId: this.profile?.profileId ?? this.latestTelemetry?.profileId,
      displayName: this.profile?.displayName ?? 'Objeto móvil',
      kind: this.profile?.kind ?? 'Generic',
      trackingMode: this.latestPose?.mode,
      positionValid: this.latestPose?.positionValid ?? false,
      position: p ? [round(p.x), round(p.y), round(p.z)] : null,
      rotationEuler: e ? [round(radToDeg(e.x), 0), round(radToDeg(e.y), 0), round(radToDeg(e.z), 0)] : null,
      confidence: round(this.latestPose?.confidence ?? 0),
      battery: this.latestTelemetry?.battery ?? 0,
      vibration: this.latestTelemetry?.vibration ?? 0,
      speed: this.latestTelemetry?.speed ?? 0,
      state: this.latestTelemetry?.state,
      extraUserContext: this.extraUserContext
    }, null, 2);
  }
}

function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function radToDeg(v: number): number {
  return v * 180 / Math.PI;
}
