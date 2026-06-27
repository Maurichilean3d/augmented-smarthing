import { XRObjectCommand } from '../core/types';
import { IObjectActuator } from './objectActuator';

export class SimulatedActuatorBridge implements IObjectActuator {
  simulatedState = 'idle';
  simulatedSpeed = 0;

  async execute(command: XRObjectCommand): Promise<string> {
    switch (command.command) {
      case 'start':
        this.simulatedState = 'running';
        this.simulatedSpeed = Math.max(1, command.value ?? 1);
        break;
      case 'stop':
        this.simulatedState = 'stopped';
        this.simulatedSpeed = 0;
        break;
      case 'set_speed':
        this.simulatedState = 'running';
        this.simulatedSpeed = clamp(command.value ?? 0, 0, 10);
        break;
      case 'pulse':
        this.simulatedState = 'pulse';
        this.simulatedSpeed = Math.max(1, command.value ?? 1);
        break;
      default:
        this.simulatedState = `command:${command.command}`;
        break;
    }
    return `Simulated ${command.command}. State=${this.simulatedState}, speed=${this.simulatedSpeed}`;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
