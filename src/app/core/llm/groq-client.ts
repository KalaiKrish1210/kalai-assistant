import { Service, inject } from '@angular/core';
import { StreamChatRequest } from '../models/assistant';
import { SettingsStore } from '../services/settings-store';
import { LlmClient } from './llm-client';
import { listOpenAiModels, streamOpenAiChat } from './openai-compatible';
import { requireMatchingKey } from './provider-catalog';

const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
];

@Service()
export class GroqClient implements LlmClient {
  readonly id = 'groq' as const;
  private readonly settings = inject(SettingsStore);

  async listModels(abortSignal?: AbortSignal): Promise<string[]> {
    const names = await listOpenAiModels(
      `${this.baseUrl()}/openai/v1/models`,
      this.requireApiKey(),
      abortSignal,
    );
    return names.length ? names : GROQ_FALLBACK_MODELS;
  }

  async stream(request: StreamChatRequest): Promise<void> {
    const snapshot = this.settings.snapshot();
    await streamOpenAiChat({
      url: `${this.baseUrl()}/openai/v1/chat/completions`,
      apiKey: this.requireApiKey(),
      model: await this.resolveModel(),
      systemPrompt: snapshot.systemPrompt,
      messages: request.messages,
      abortSignal: request.abortSignal,
      onToken: request.onToken,
    });
  }

  private async resolveModel(): Promise<string> {
    const requested = this.settings.snapshot().groqModel;
    try {
      const models = await this.listModels();
      if (models.includes(requested)) {
        return requested;
      }
      const replacement =
        GROQ_FALLBACK_MODELS.find((model) => models.includes(model)) ?? models[0];
      if (replacement && replacement !== requested) {
        this.settings.update({ groqModel: replacement });
        return replacement;
      }
    } catch {
      // Fall through to the requested model.
    }
    return requested;
  }

  private requireApiKey(): string {
    return requireMatchingKey('groq', this.settings.snapshot().groqApiKey);
  }

  private baseUrl(): string {
    return '/llm/groq';
  }
}
