import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { XRMobilePose, XRMobileTelemetryPacket, TrackingMode, clamp01, quaternionFromPacket } from '../core/types';
import { MobileObjectProfile } from '../profiles/mobileObjectProfile';
import { UwbAnchorRegistry } from './anchorRegistry';
import { PoseSmoother } from './poseSmoother';
import { TrilaterationSolver } from './trilaterationSolver';

export class TrackingFusionController {
  smoother = new PoseSmoother();
  maxResidualMeters = 0.75;
  rejectHighResidual = true;
  logSolverWarnings = true;

  latestTelemetry?: XRMobileTelemetryPacket;
  latestPose: XRMobilePose = {
    worldPosition: new Vector3(),
    worldRotation: new Quaternion(),
    mode: 'Free3D',
    positionValid: false,
    rotationValid: false,
    confidence: 0
  };

  private imuMountOffset = new Quaternion();
  private imuWebXROffset = new Quaternion();
  private telemetryListeners = new Set<(packet: XRMobileTelemetryPacket) => void>();
  private poseListeners = new Set<(pose: XRMobilePose) => void>();

  constructor(
    public anchorRegistry: UwbAnchorRegistry,
    public targetRoot: Object3D,
    public imuOrientationEmpty?: Object3D,
    public profile?: MobileObjectProfile
  ) {
    this.applyProfile(profile);
  }

  applyProfile(profile?: MobileObjectProfile): void {
    this.profile = profile;
    this.applyProfileOffsets();
  }

  onTelemetryUpdated(listener: (packet: XRMobileTelemetryPacket) => void): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  onPoseUpdated(listener: (pose: XRMobilePose) => void): () => void {
    this.poseListeners.add(listener);
    return () => this.poseListeners.delete(listener);
  }

  handlePacket(packet: XRMobileTelemetryPacket): void {
    if (!packet || !packet.objectId) return;
    if (packet === this.latestTelemetry) return;

    this.latestTelemetry = packet;
    for (const listener of this.telemetryListeners) listener(packet);

    const mode = this.resolveMode(packet);
    const pose: XRMobilePose = {
      worldPosition: this.latestPose.worldPosition.clone(),
      worldRotation: this.latestPose.worldRotation.clone(),
      mode,
      positionValid: false,
      rotationValid: false,
      confidence: 0
    };

    const solved = this.trySolvePosition(packet, mode);
    if (solved) {
      const worldPosition = this.anchorRegistry.toWorld(solved.localPosition);
      const smoothed = this.smoother.smoothPosition(worldPosition);
      if (smoothed) {
        this.targetRoot.position.copy(smoothed);
        pose.worldPosition.copy(smoothed);
        pose.positionValid = true;
        pose.confidence = solved.confidence;
      }
    }

    const rotation = this.trySolveRotation(packet);
    if (rotation) {
      const smoothedRot = this.smoother.smoothRotation(rotation);
      if (this.imuOrientationEmpty) this.imuOrientationEmpty.quaternion.copy(smoothedRot);
      else this.targetRoot.quaternion.copy(smoothedRot);
      pose.worldRotation.copy(smoothedRot);
      pose.rotationValid = true;
    }

    this.latestPose = pose;
    for (const listener of this.poseListeners) listener(pose);
  }

  private applyProfileOffsets(): void {
    const mount = this.profile?.imuMountEulerOffset ?? { x: 0, y: 0, z: 0 };
    const webxr = this.profile?.imuWebXREulerOffset ?? { x: 0, y: 0, z: 0 };
    this.imuMountOffset.setFromEuler(new Euler(degToRad(mount.x), degToRad(mount.y), degToRad(mount.z), 'XYZ'));
    this.imuWebXROffset.setFromEuler(new Euler(degToRad(webxr.x), degToRad(webxr.y), degToRad(webxr.z), 'XYZ'));
  }

  private resolveMode(packet: XRMobileTelemetryPacket): TrackingMode {
    const fallback = this.profile?.defaultTrackingMode ?? 'Free3D';
    const allowSwitch = this.profile?.allowPacketToSwitchMode ?? true;
    if (!allowSwitch || !packet.trackingMode) return fallback;

    const m = packet.trackingMode.trim().toLowerCase();
    if (['2d', 'planar2d', 'planar', 'plane'].includes(m)) return 'Planar2D';
    if (['3d', 'free3d', 'free', 'space'].includes(m)) return 'Free3D';
    return fallback;
  }

  private trySolvePosition(packet: XRMobileTelemetryPacket, mode: TrackingMode): { localPosition: Vector3; confidence: number } | null {
    if (!packet.ranges?.length) return null;

    const localAnchorPositions: Vector3[] = [];
    const rangesMeters: number[] = [];

    for (const range of packet.ranges) {
      if (!range.anchorId || range.meters <= 0.05 || range.meters > 100) continue;
      const anchorLocal = this.anchorRegistry.tryGetLocalPosition(range.anchorId);
      if (!anchorLocal) continue;
      localAnchorPositions.push(anchorLocal);
      rangesMeters.push(range.meters);
    }

    if (mode === 'Planar2D') {
      if (localAnchorPositions.length < 3) return null;
      const planarY = this.profile?.planarYLocal ?? 0;
      const localPosition = TrilaterationSolver.trySolvePlanar2D(
        localAnchorPositions[0], localAnchorPositions[1], localAnchorPositions[2],
        rangesMeters[0], rangesMeters[1], rangesMeters[2],
        planarY
      );
      if (!localPosition) {
        if (this.logSolverWarnings) console.warn('[XRMobile] 2D solve failed. Check anchor geometry.');
        return null;
      }
      return { localPosition, confidence: 0.75 };
    }

    if (localAnchorPositions.length < 4) return null;
    const solved = TrilaterationSolver.trySolveFree3DLeastSquares(localAnchorPositions, rangesMeters);
    if (!solved) {
      if (this.logSolverWarnings) console.warn('[XRMobile] 3D solve failed. Anchors may be coplanar/badly placed.');
      return null;
    }

    const confidence = clamp01(1 - solved.residual / Math.max(0.001, this.maxResidualMeters));
    if (this.rejectHighResidual && solved.residual > this.maxResidualMeters) {
      if (this.logSolverWarnings) console.warn(`[XRMobile] 3D solve rejected. Residual=${solved.residual.toFixed(2)}m`);
      return null;
    }

    return { localPosition: solved.position, confidence };
  }

  private trySolveRotation(packet: XRMobileTelemetryPacket): Quaternion | null {
    const raw = quaternionFromPacket(packet.imu);
    return this.imuWebXROffset.clone().multiply(raw).multiply(this.imuMountOffset).normalize();
  }
}

function degToRad(v: number): number {
  return v * Math.PI / 180;
}
