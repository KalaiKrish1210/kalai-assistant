import { Service, inject } from '@angular/core';
import { StreamChatRequest } from '../models/assistant';
import { SettingsStore } from '../services/settings-store';
import { LlmClient } from './llm-client';
import { listOpenAiModels, streamOpenAiChat } from './openai-compatible';
import { requireMatchingKey } from './provider-catalog';

const GROK_FALLBACK_MODELS = [
  'grok-3-mini',
  'grok-4-fast-non-reasoning',
  'grok-4',
  'grok-3',
  'grok-2',
];

@Service()
export class GrokClient implements LlmClient {
  readonly id = 'grok' as const;
  private readonly settings = inject(SettingsStore);

  async listModels(abortSignal?: AbortSignal): Promise<string[]> {
    const names = await listOpenAiModels(`${this.baseUrl()}/v1/models`, this.requireApiKey(), abortSignal);
    return names.length ? names : GROK_FALLBACK_MODELS;
  }

  async stream(request: StreamChatRequest): Promise<void> {
    const snapshot = this.settings.snapshot();
    await streamOpenAiChat({
      url: `${this.baseUrl()}/v1/chat/completions`,
      apiKey: this.requireApiKey(),
      model: snapshot.grokModel,
      systemPrompt: snapshot.systemPrompt,
      messages: request.messages,
      abortSignal: request.abortSignal,
      onToken: request.onToken,
    });
  }

  private requireApiKey(): string {
    return requireMatchingKey('grok', this.settings.snapshot().grokApiKey);
  }

  private baseUrl(): string {
    return '/llm/grok';
  }
}
