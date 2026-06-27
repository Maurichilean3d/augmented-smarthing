import { ILLMProvider } from './llmProvider';

export class MockLLMProvider implements ILLMProvider {
  async ask(_systemPrompt: string, stateBlock: string, userMessage: string): Promise<string> {
    return [
      'Estoy en modo sandbox WebXR.',
      'Puedo leer telemetría, explicar el estado y proponer acciones de UI.',
      `Mensaje usuario: ${userMessage}`,
      '',
      'Estado actual:',
      stateBlock
    ].join('\n');
  }
}
