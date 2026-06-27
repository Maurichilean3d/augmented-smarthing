import { Object3D, Quaternion, Vector3 } from 'three';

// WebXR Anchors are still optional across runtimes, so this mirrors the Unity
// MetaSpatialAnchorBinding while keeping the app usable with static anchors.
export class WebXRSpatialAnchorBinding {
  isLoadedAndLocalized = true;
  xrAnchor?: XRAnchor;

  constructor(
    public logicalAnchorId: string,
    public object: Object3D
  ) {}

  get worldPosition(): Vector3 {
    const out = new Vector3();
    this.object.getWorldPosition(out);
    return out;
  }

  get worldRotation(): Quaternion {
    const out = new Quaternion();
    this.object.getWorldQuaternion(out);
    return out;
  }
}

declare global {
  interface XRAnchor {}
}
