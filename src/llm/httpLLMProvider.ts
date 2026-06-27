import { ILLMProvider } from './llmProvider';

export class HttpLLMProvider implements ILLMProvider {
  constructor(public endpointUrl = '/llm') {}

  async ask(systemPrompt: string, stateBlock: string, userMessage: string): Promise<string> {
    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemPrompt, state: stateBlock, message: userMessage })
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.error) throw new Error(json.error ?? response.statusText);
    return json.answer ?? JSON.stringify(json, null, 2);
  }
}
