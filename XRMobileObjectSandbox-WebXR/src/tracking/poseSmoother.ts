import { Quaternion, Vector3 } from 'three';

export class PoseSmoother {
  positionAlpha = 0.25;
  rotationAlpha = 0.25;
  maxJumpMeters = 1.5;
  rejectLargeJumps = true;

  private hasPosition = false;
  private position = new Vector3();
  private rotation = new Quaternion();

  reset(): void {
    this.hasPosition = false;
    this.position.set(0, 0, 0);
    this.rotation.identity();
  }

  smoothPosition(newPosition: Vector3): Vector3 | null {
    if (!this.hasPosition) {
      this.position.copy(newPosition);
      this.hasPosition = true;
      return this.position.clone();
    }

    if (this.rejectLargeJumps && this.position.distanceTo(newPosition) > this.maxJumpMeters) return null;

    this.position.lerp(newPosition, clamp01(this.positionAlpha));
    return this.position.clone();
  }

  smoothRotation(newRotation: Quaternion): Quaternion {
    this.rotation.slerp(newRotation, clamp01(this.rotationAlpha));
    return this.rotation.clone();
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
