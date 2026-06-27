import { Object3D, Vector3 } from 'three';

export interface AnchorEntry {
  anchorId: string;
  object: Object3D;
  trust?: number;
}

export class UwbAnchorRegistry {
  readonly anchors: AnchorEntry[] = [];
  private readonly byId = new Map<string, AnchorEntry>();

  constructor(public worldCalibrationRoot?: Object3D) {}

  setAnchors(anchors: AnchorEntry[]): void {
    this.anchors.length = 0;
    this.byId.clear();
    for (const anchor of anchors) this.addAnchor(anchor);
  }

  addAnchor(anchor: AnchorEntry): void {
    if (!anchor.anchorId || !anchor.object) return;
    const normalized = anchor.anchorId.trim();
    const entry = { ...anchor, anchorId: normalized };
    this.anchors.push(entry);
    this.byId.set(normalized, entry);
  }

  tryGetLocalPosition(anchorId: string): Vector3 | null {
    const entry = this.byId.get(anchorId.trim());
    if (!entry) return null;
    const world = new Vector3();
    entry.object.getWorldPosition(world);
    return this.toLocal(world);
  }

  toLocal(worldPosition: Vector3): Vector3 {
    if (!this.worldCalibrationRoot) return worldPosition.clone();
    this.worldCalibrationRoot.updateWorldMatrix(true, false);
    return this.worldCalibrationRoot.worldToLocal(worldPosition.clone());
  }

  toWorld(localPosition: Vector3): Vector3 {
    if (!this.worldCalibrationRoot) return localPosition.clone();
    this.worldCalibrationRoot.updateWorldMatrix(true, false);
    return this.worldCalibrationRoot.localToWorld(localPosition.clone());
  }
}
