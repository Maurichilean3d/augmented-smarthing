export interface ILLMProvider {
  ask(systemPrompt: string, stateBlock: string, userMessage: string): Promise<string>;
}
