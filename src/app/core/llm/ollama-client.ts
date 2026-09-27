import { Service, inject } from '@angular/core';
import { StreamChatRequest } from '../models/assistant';
import { SettingsStore } from '../services/settings-store';
import { readHttpError, readNdjsonStream } from '../utils/stream';
import { LlmClient } from './llm-client';

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

interface OllamaChatChunk {
  message?: { content?: string };
  error?: string;
  done?: boolean;
}

@Service()
export class OllamaClient implements LlmClient {
  readonly id = 'ollama' as const;
  private readonly settings = inject(SettingsStore);

  async listModels(abortSignal?: AbortSignal): Promise<string[]> {
    const response = await fetch(`${this.baseUrl()}/api/tags`, { signal: abortSignal });
    if (!response.ok) {
      throw new Error(await readHttpError(response, 'Could not list Ollama models'));
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    return (payload.models ?? []).map((model) => model.name).filter((name): name is string => !!name);
  }

  async stream(request: StreamChatRequest): Promise<void> {
    const snapshot = this.settings.snapshot();
    const response = await fetch(`${this.baseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.abortSignal,
      body: JSON.stringify({
        model: snapshot.ollamaModel,
        stream: true,
        messages: [
          { role: 'system', content: snapshot.systemPrompt },
          ...request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
    }).catch(() => {
      throw new Error(
        'Ollama is not reachable. Start Ollama, or switch to Gemini in Settings.',
      );
    });

    if (!response.ok) {
      if (response.status === 502 || response.status === 504) {
        throw new Error(
          'Ollama is not running. Start Ollama locally, pull a model, or switch to Gemini in Settings.',
        );
      }
      throw new Error(await readHttpError(response, 'Ollama request failed'));
    }

    await readNdjsonStream(response, request.abortSignal, (payload) => {
      const chunk = payload as OllamaChatChunk;
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      const token = chunk.message?.content ?? '';
      if (token) {
        request.onToken(token);
      }
    });
  }

  private baseUrl(): string {
    return this.settings.snapshot().ollamaBaseUrl.replace(/\/$/, '');
  }
}
