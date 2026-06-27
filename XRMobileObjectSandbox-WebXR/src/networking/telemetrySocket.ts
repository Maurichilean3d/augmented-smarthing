import { XRMobileTelemetryPacket } from '../core/types';

export class TelemetrySocket {
  reconnectMs = 1200;
  private socket?: WebSocket;
  private listeners = new Set<(packet: XRMobileTelemetryPacket) => void>();
  private statusListeners = new Set<(status: string) => void>();
  private stopped = false;

  constructor(public url: string) {}

  connect(): void {
    this.stopped = false;
    this.open();
  }

  close(): void {
    this.stopped = true;
    this.socket?.close();
  }

  onPacket(listener: (packet: XRMobileTelemetryPacket) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (status: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private open(): void {
    this.emitStatus('Conectando al bridge…');
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => this.emitStatus('Bridge conectado'));
    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(String(event.data));
        if (data.type === 'telemetry') {
          for (const listener of this.listeners) listener(data.packet);
        }
      } catch (error) {
        console.warn('[XRMobile] Invalid telemetry websocket message', error);
      }
    });

    this.socket.addEventListener('close', () => {
      this.emitStatus('Bridge desconectado');
      if (!this.stopped) window.setTimeout(() => this.open(), this.reconnectMs);
    });

    this.socket.addEventListener('error', () => this.emitStatus('Error de bridge'));
  }

  private emitStatus(status: string): void {
    for (const listener of this.statusListeners) listener(status);
  }
}
