import { Vector2, Vector3 } from 'three';
import { Matrix3x3 } from './matrix3x3';

export interface Solve3DResult {
  position: Vector3;
  residual: number;
}

export class TrilaterationSolver {
  static trySolvePlanar2D(
    a3: Vector3,
    b3: Vector3,
    c3: Vector3,
    ra: number,
    rb: number,
    rc: number,
    planarY: number
  ): Vector3 | null {
    const a = new Vector2(a3.x, a3.z);
    const b = new Vector2(b3.x, b3.z);
    const c = new Vector2(c3.x, c3.z);

    const A = 2 * (b.x - a.x);
    const B = 2 * (b.y - a.y);
    const C = ra * ra - rb * rb + b.lengthSq() - a.lengthSq();

    const D = 2 * (c.x - a.x);
    const E = 2 * (c.y - a.y);
    const F = ra * ra - rc * rc + c.lengthSq() - a.lengthSq();

    const det = A * E - B * D;
    if (Math.abs(det) < 1e-4) return null;

    const x = (C * E - B * F) / det;
    const z = (A * F - C * D) / det;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return new Vector3(x, planarY, z);
  }

  static trySolveFree3DLeastSquares(anchors: Vector3[], ranges: number[]): Solve3DResult | null {
    if (anchors.length < 4 || ranges.length < 4) return null;

    const p0 = anchors[0];
    const r0 = ranges[0];
    const ata = new Matrix3x3();
    const atb = new Vector3();

    for (let i = 1; i < anchors.length; i++) {
      const row = anchors[i].clone().sub(p0).multiplyScalar(2);
      const bi = r0 * r0 - ranges[i] * ranges[i] + anchors[i].lengthSq() - p0.lengthSq();

      ata.m00 += row.x * row.x;
      ata.m01 += row.x * row.y;
      ata.m02 += row.x * row.z;
      ata.m10 += row.y * row.x;
      ata.m11 += row.y * row.y;
      ata.m12 += row.y * row.z;
      ata.m20 += row.z * row.x;
      ata.m21 += row.z * row.y;
      ata.m22 += row.z * row.z;

      atb.x += row.x * bi;
      atb.y += row.y * bi;
      atb.z += row.z * bi;
    }

    const position = ata.trySolve(atb);
    if (!position) return null;

    const residual = this.computeResidual(anchors, ranges, position);
    return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)
      ? { position, residual }
      : null;
  }

  static computeResidual(anchors: Vector3[], ranges: number[], point: Vector3): number {
    const count = Math.min(anchors.length, ranges.length);
    if (count === 0) return Number.POSITIVE_INFINITY;
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const predicted = point.distanceTo(anchors[i]);
      const error = predicted - ranges[i];
      sum += error * error;
    }
    return Math.sqrt(sum / Math.max(1, count));
  }
}
