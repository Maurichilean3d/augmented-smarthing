import { XRObjectCommand } from '../core/types';
import { IObjectActuator } from './objectActuator';

export class HttpActuatorBridge implements IObjectActuator {
  constructor(public endpointUrl = '/actuator') {}

  async execute(command: XRObjectCommand): Promise<string> {
    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.error) throw new Error(json.error ?? response.statusText);
    return JSON.stringify(json, null, 2);
  }
}
