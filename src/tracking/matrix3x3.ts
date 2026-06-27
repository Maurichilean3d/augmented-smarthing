import { Vector3 } from 'three';

export class Matrix3x3 {
  m00 = 0; m01 = 0; m02 = 0;
  m10 = 0; m11 = 0; m12 = 0;
  m20 = 0; m21 = 0; m22 = 0;

  trySolve(b: Vector3): Vector3 | null {
    const det = this.determinant();
    if (Math.abs(det) < 1e-6) return null;
    const inv = this.inverse(det);
    const x = inv.multiplyVector(b);
    return Number.isFinite(x.x) && Number.isFinite(x.y) && Number.isFinite(x.z) ? x : null;
  }

  private determinant(): number {
    return this.m00 * (this.m11 * this.m22 - this.m12 * this.m21)
      - this.m01 * (this.m10 * this.m22 - this.m12 * this.m20)
      + this.m02 * (this.m10 * this.m21 - this.m11 * this.m20);
  }

  private inverse(det: number): Matrix3x3 {
    const invDet = 1 / det;
    const r = new Matrix3x3();
    r.m00 =  (this.m11 * this.m22 - this.m12 * this.m21) * invDet;
    r.m01 = -(this.m01 * this.m22 - this.m02 * this.m21) * invDet;
    r.m02 =  (this.m01 * this.m12 - this.m02 * this.m11) * invDet;
    r.m10 = -(this.m10 * this.m22 - this.m12 * this.m20) * invDet;
    r.m11 =  (this.m00 * this.m22 - this.m02 * this.m20) * invDet;
    r.m12 = -(this.m00 * this.m12 - this.m02 * this.m10) * invDet;
    r.m20 =  (this.m10 * this.m21 - this.m11 * this.m20) * invDet;
    r.m21 = -(this.m00 * this.m21 - this.m01 * this.m20) * invDet;
    r.m22 =  (this.m00 * this.m11 - this.m01 * this.m10) * invDet;
    return r;
  }

  private multiplyVector(v: Vector3): Vector3 {
    return new Vector3(
      this.m00 * v.x + this.m01 * v.y + this.m02 * v.z,
      this.m10 * v.x + this.m11 * v.y + this.m12 * v.z,
      this.m20 * v.x + this.m21 * v.y + this.m22 * v.z
    );
  }
}
