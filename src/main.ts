import './styles.css';
import { WebXRMobileSandboxApp } from './webxr/app';

const app = new WebXRMobileSandboxApp({
  canvas: document.querySelector<HTMLCanvasElement>('#xr-canvas')!,
  dashboardRoot: document.querySelector<HTMLElement>('#dashboard')!,
  wsUrl: buildTelemetryWsUrl()
});

app.start();

function buildTelemetryWsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/telemetry`;
}
