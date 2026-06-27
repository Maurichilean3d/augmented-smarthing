import { CanvasTexture, LinearFilter, Object3D, Sprite, SpriteMaterial, Vector3 } from 'three';
import { XRMobilePose, XRMobileTelemetryPacket } from '../core/types';

export class BillboardPanel {
  readonly sprite: Sprite;
  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d')!;
  private readonly texture: CanvasTexture;
  private latestTelemetry?: XRMobileTelemetryPacket;
  private latestPose?: XRMobilePose;
  private title = 'Objeto móvil';

  constructor(parent: Object3D, localOffset = new Vector3(0.35, 0.25, 0)) {
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;

    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, transparent: true }));
    this.sprite.position.copy(localOffset);
    this.sprite.scale.set(0.5, 0.25, 1);
    parent.add(this.sprite);
    this.redraw();
  }

  setTitle(title: string): void {
    this.title = title;
    this.redraw();
  }

  updateTelemetry(packet: XRMobileTelemetryPacket): void {
    this.latestTelemetry = packet;
    this.redraw();
  }

  updatePose(pose: XRMobilePose): void {
    this.latestPose = pose;
    this.redraw();
  }

  updateBillboard(camera: Object3D): void {
    const world = new Vector3();
    camera.getWorldPosition(world);
    this.sprite.lookAt(world);
  }

  private redraw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = 'rgba(8, 12, 20, 0.82)';
    roundRect(ctx, 0, 0, this.canvas.width, this.canvas.height, 28);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 34px system-ui';
    ctx.fillText(this.title, 28, 48);

    ctx.font = '24px system-ui';
    const p = this.latestPose?.worldPosition;
    const telemetry = this.latestTelemetry;
    ctx.fillText(`Batería: ${(telemetry?.battery ?? 0).toFixed(0)}%   Estado: ${telemetry?.state ?? '—'}`, 28, 92);
    ctx.fillText(p ? `Posición: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}` : 'Posición: —', 28, 132);
    ctx.fillText(`Confianza: ${(((this.latestPose?.confidence ?? 0) * 100)).toFixed(0)}%`, 28, 172);
    ctx.fillText(`Vibración: ${(telemetry?.vibration ?? 0).toFixed(2)}  Velocidad: ${(telemetry?.speed ?? 0).toFixed(2)}`, 28, 212);

    this.texture.needsUpdate = true;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
