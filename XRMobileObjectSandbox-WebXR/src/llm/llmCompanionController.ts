import { ActuatorCommandRouter } from '../actuation/actuatorCommandRouter';
import { LLMContextBuilder } from './contextBuilder';
import { ILLMProvider } from './llmProvider';

export class LLMCompanionController {
  constructor(
    private contextBuilder: LLMContextBuilder,
    private provider: ILLMProvider,
    private commandRouter?: ActuatorCommandRouter
  ) {}

  async ask(userMessage: string): Promise<string> {
    return this.provider.ask(
      this.contextBuilder.buildSystemPrompt(),
      this.contextBuilder.buildStateJsonLikeBlock(),
      userMessage || '¿Qué está pasando con el objeto?'
    );
  }

  suggestStop(): void {
    this.commandRouter?.queueCommand({ command: 'stop', value: 0, requiresHumanConfirm: true });
  }
}
