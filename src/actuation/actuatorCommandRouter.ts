import { XRObjectCommand } from '../core/types';
import { MobileObjectProfile } from '../profiles/mobileObjectProfile';
import { IObjectActuator } from './objectActuator';

export class ActuatorCommandRouter {
  requireHumanConfirmForAll = true;
  pendingCommand?: XRObjectCommand;
  logCommands = true;

  constructor(public profile: MobileObjectProfile | undefined, private actuator?: IObjectActuator) {}

  setProfile(profile: MobileObjectProfile): void {
    this.profile = profile;
  }

  setActuator(actuator: IObjectActuator): void {
    this.actuator = actuator;
  }

  queueCommand(command: XRObjectCommand): void {
    command.profileId = this.profile?.profileId ?? command.profileId;
    const needsConfirm = this.requireHumanConfirmForAll || command.requiresHumanConfirm !== false;
    if (needsConfirm) {
      this.pendingCommand = command;
      if (this.logCommands) console.info(`[XRMobile] Command pending confirmation: ${command.command}`);
      return;
    }
    void this.executeNow(command);
  }

  async confirmPending(): Promise<string | undefined> {
    const command = this.pendingCommand;
    this.pendingCommand = undefined;
    return command ? this.executeNow(command) : undefined;
  }

  cancelPending(): void {
    this.pendingCommand = undefined;
  }

  async executeNow(command: XRObjectCommand): Promise<string> {
    if (this.profile && !this.profile.allowActuation) {
      const msg = `[XRMobile] Actuation blocked by profile: ${this.profile.profileId}`;
      console.warn(msg);
      return msg;
    }
    if (!this.actuator) {
      const msg = '[XRMobile] No actuator configured. Command ignored/simulated.';
      console.warn(msg);
      return msg;
    }
    if (this.logCommands) console.info(`[XRMobile] Executing command: ${command.command} value=${command.value ?? 0}`);
    return this.actuator.execute(command);
  }

  queueStart(): void { this.queueCommand({ command: 'start', value: 1, requiresHumanConfirm: true }); }
  queueStop(): void { this.queueCommand({ command: 'stop', value: 0, requiresHumanConfirm: false }); }
  queuePulse(): void { this.queueCommand({ command: 'pulse', value: 1, requiresHumanConfirm: true }); }
  queueSpeed(level: number): void { this.queueCommand({ command: 'set_speed', value: level, requiresHumanConfirm: true }); }
}
