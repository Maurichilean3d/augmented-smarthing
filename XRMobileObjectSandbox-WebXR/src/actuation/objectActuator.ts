import { XRObjectCommand } from '../core/types';

export interface IObjectActuator {
  execute(command: XRObjectCommand): Promise<string>;
}
