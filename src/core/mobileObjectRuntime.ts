import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import { ActuatorCommandRouter } from '../actuation/actuatorCommandRouter';
import { LLMContextBuilder } from '../llm/contextBuilder';
import { MobileObjectProfile } from '../profiles/mobileObjectProfile';
import { TrackingFusionController } from '../tracking/trackingFusionController';
import { BillboardPanel } from '../ui/billboardPanel';
import { MobileObjectDashboard } from '../ui/dashboard';

export class MobileObjectRuntime {
  readonly root = new Group();
  readonly modelParent = new Group();
  readonly dashboardParent = new Group();
  private modelInstance?: Object3D;
  private billboard?: BillboardPanel;

  constructor(
    public profile: MobileObjectProfile,
    public tracking: TrackingFusionController,
    public dashboard?: MobileObjectDashboard,
    public llmContext?: LLMContextBuilder,
    public actuatorRouter?: ActuatorCommandRouter
  ) {
    this.root.name = 'MobileObjectRoot';
    this.modelParent.name = 'ModelParent';
    this.dashboardParent.name = 'DashboardParent';
    this.root.add(this.modelParent, this.dashboardParent);
    this.applyProfile(profile);

    this.tracking.onTelemetryUpdated((packet) => {
      this.dashboard?.updateTelemetry(packet);
      this.billboard?.updateTelemetry(packet);
      this.llmContext?.updateTelemetry(packet);
    });

    this.tracking.onPoseUpdated((pose) => {
      this.dashboard?.updatePose(pose);
      this.billboard?.updatePose(pose);
      this.llmContext?.updatePose(pose);
    });
  }

  applyProfile(profile: MobileObjectProfile): void {
    this.profile = profile;
    this.tracking.applyProfile(profile);
    this.dashboard?.setProfile(profile);
    this.llmContext?.setProfile(profile);
    this.actuatorRouter?.setProfile(profile);
    this.spawnVisuals();
  }

  updateBillboard(camera: Object3D): void {
    this.billboard?.updateBillboard(camera);
  }

  private spawnVisuals(): void {
    if (this.modelInstance) this.modelParent.remove(this.modelInstance);
    this.modelInstance = this.createModel();
    this.modelInstance.position.copy(vector(this.profile.modelLocalOffset));
    this.modelParent.add(this.modelInstance);

    if (this.billboard) this.dashboardParent.remove(this.billboard.sprite);
    this.billboard = new BillboardPanel(this.dashboardParent, vector(this.profile.dashboardLocalOffset));
    this.billboard.setTitle(this.profile.displayName);
  }

  private createModel(): Mesh {
    const scale = this.profile.modelScale;
    const material = new MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 });
    const geometry = this.profile.modelKind === 'sphere'
      ? new SphereGeometry(0.5, 32, 16)
      : this.profile.modelKind === 'cylinder'
        ? new CylinderGeometry(0.5, 0.5, 1, 32)
        : new BoxGeometry(1, 1, 1);
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(scale.x, scale.y, scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

function vector(v: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}
