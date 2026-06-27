import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ActuatorCommandRouter } from '../actuation/actuatorCommandRouter';
import { SimulatedActuatorBridge } from '../actuation/simulatedActuatorBridge';
import { MobileObjectRuntime } from '../core/mobileObjectRuntime';
import { BrowserTelemetrySimulator } from '../demo/browserTelemetrySimulator';
import { LLMCompanionController } from '../llm/llmCompanionController';
import { LLMContextBuilder } from '../llm/contextBuilder';
import { HttpLLMProvider } from '../llm/httpLLMProvider';
import { TelemetrySocket } from '../networking/telemetrySocket';
import { ProfileRegistry } from '../profiles/profileRegistry';
import { UwbAnchorRegistry } from '../tracking/anchorRegistry';
import { TrackingFusionController } from '../tracking/trackingFusionController';
import { MobileObjectDashboard } from '../ui/dashboard';

export interface WebXRMobileSandboxAppOptions {
  canvas: HTMLCanvasElement;
  dashboardRoot: HTMLElement;
  wsUrl: string;
}

export class WebXRMobileSandboxApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly profileRegistry = new ProfileRegistry();
  private readonly dashboard: MobileObjectDashboard;
  private readonly worldCalibrationRoot = new THREE.Group();
  private readonly anchorObjects: { id: string; object: THREE.Object3D }[] = [];
  private readonly anchorRegistry = new UwbAnchorRegistry(this.worldCalibrationRoot);
  private readonly tracking: TrackingFusionController;
  private readonly runtime: MobileObjectRuntime;
  private readonly telemetrySocket: TelemetrySocket;
  private readonly llmController: LLMCompanionController;
  private browserSimulator?: BrowserTelemetrySimulator;

  constructor(private options: WebXRMobileSandboxAppOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;

    this.dashboard = new MobileObjectDashboard(options.dashboardRoot);

    const fallbackProfile = this.profileRegistry.resolve('hotwheels');
    const targetRoot = new THREE.Group();
    this.tracking = new TrackingFusionController(this.anchorRegistry, targetRoot, undefined, fallbackProfile);
    const llmContext = new LLMContextBuilder(fallbackProfile);
    const actuatorRouter = new ActuatorCommandRouter(fallbackProfile, new SimulatedActuatorBridge());
    this.runtime = new MobileObjectRuntime(fallbackProfile, this.tracking, this.dashboard, llmContext, actuatorRouter);
    targetRoot.add(this.runtime.root);
    this.worldCalibrationRoot.add(targetRoot);

    this.telemetrySocket = new TelemetrySocket(options.wsUrl);
    this.llmController = new LLMCompanionController(llmContext, new HttpLLMProvider('/llm'), actuatorRouter);

    this.setupScene();
    this.setupUi();
  }

  start(): void {
    const mode = new URLSearchParams(location.search).get('xr') ?? 'ar';
    document.body.appendChild(mode === 'vr' ? VRButton.createButton(this.renderer) : ARButton.createButton(this.renderer, { requiredFeatures: [] }));

    this.telemetrySocket.onStatus((status) => this.dashboard.setConnection(status));
    this.telemetrySocket.onPacket((packet) => {
      const profile = this.profileRegistry.resolve(packet.profileId);
      if (profile.profileId !== this.runtime.profile.profileId) this.runtime.applyProfile(profile);
      this.tracking.handlePacket(packet);
    });

    if (new URLSearchParams(location.search).get('demo') === '1') {
      this.dashboard.setConnection('Demo local activo');
      this.browserSimulator = new BrowserTelemetrySimulator(this.anchorObjects, (packet) => this.tracking.handlePacket(packet));
      this.browserSimulator.start();
    } else {
      this.telemetrySocket.connect();
    }

    this.renderer.setAnimationLoop(() => this.render());
    addEventListener('resize', () => this.onResize());
  }

  private setupScene(): void {
    this.scene.add(this.worldCalibrationRoot);
    this.camera.position.set(0, 1.4, 2.2);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.4);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(2, 3, 2);
    dir.castShadow = true;
    this.scene.add(dir);

    const grid = new THREE.GridHelper(4, 20);
    grid.position.y = -0.01;
    this.worldCalibrationRoot.add(grid);

    this.createFixedAnchor('A', new THREE.Vector3(-1.0, 0.0, -1.0));
    this.createFixedAnchor('B', new THREE.Vector3( 1.0, 0.0, -1.0));
    this.createFixedAnchor('C', new THREE.Vector3(-1.0, 0.0,  1.0));
    this.createFixedAnchor('D', new THREE.Vector3( 1.0, 0.9,  1.0));

    this.anchorRegistry.setAnchors(this.anchorObjects.map((a) => ({ anchorId: a.id, object: a.object, trust: 1 })));
  }

  private createFixedAnchor(id: string, position: THREE.Vector3): void {
    const group = new THREE.Group();
    group.name = `FixedAnchor_${id}`;
    group.position.copy(position);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 18, 10),
      new THREE.MeshStandardMaterial({ roughness: 0.6 })
    );
    group.add(sphere);

    const label = makeTextSprite(`UWB ${id}`);
    label.position.set(0, 0.14, 0);
    group.add(label);

    this.worldCalibrationRoot.add(group);
    this.anchorObjects.push({ id, object: group });
  }

  private setupUi(): void {
    const input = document.querySelector<HTMLTextAreaElement>('#llm-input');
    const output = document.querySelector<HTMLElement>('#llm-response');
    document.querySelector('#ask-llm')?.addEventListener('click', async () => {
      try {
        if (output) output.textContent = 'Pensando…';
        const answer = await this.llmController.ask(input?.value ?? '¿Qué está pasando con el objeto?');
        if (output) output.textContent = answer;
      } catch (error) {
        if (output) output.textContent = `Error LLM: ${(error as Error).message}`;
      }
    });

    document.querySelector('#cmd-stop')?.addEventListener('click', async () => {
      this.runtime.actuatorRouter?.queueStop();
      const msg = await this.runtime.actuatorRouter?.confirmPending();
      if (output) output.textContent = msg ?? 'Sin comando pendiente.';
    });

    document.querySelector('#cmd-pulse')?.addEventListener('click', async () => {
      this.runtime.actuatorRouter?.queuePulse();
      if (output) output.textContent = 'Comando pulse pendiente; en producción aquí mostrarías confirmación humana.';
    });
  }

  private render(): void {
    this.runtime.updateBillboard(this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px system-ui';
  ctx.fillText(text, 24, 58);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.32, 0.12, 1);
  return sprite;
}
