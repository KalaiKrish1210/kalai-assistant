import { Service, inject } from '@angular/core';
import { StreamChatRequest } from '../models/assistant';
import { SettingsStore } from '../services/settings-store';
import { readHttpError, readSseStream } from '../utils/stream';
import { requireMatchingKey } from './provider-catalog';
import { LlmClient } from './llm-client';

interface GeminiModelsResponse {
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
}

interface GeminiInteractionEvent {
  event_type?: string;
  type?: string;
  error?: { message?: string };
  delta?: {
    type?: string;
    text?: string;
  };
}

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
];

@Service()
export class GeminiClient implements LlmClient {
  readonly id = 'gemini' as const;
  private readonly settings = inject(SettingsStore);

  async listModels(abortSignal?: AbortSignal): Promise<string[]> {
    const key = this.requireApiKey();
    const response = await fetch(`${this.baseUrl()}/v1beta/models`, {
      headers: { 'x-goog-api-key': key },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(await readHttpError(response, 'Could not list Gemini models'));
    }

    const payload = (await response.json()) as GeminiModelsResponse;
    const names = (payload.models ?? [])
      .map((model) => model.name?.replace(/^models\//, ''))
      .filter((name): name is string => !!name && !name.includes('embed') && !name.includes('image'));

    return names.length ? names : GEMINI_FALLBACK_MODELS;
  }

  async stream(request: StreamChatRequest): Promise<void> {
    const snapshot = this.settings.snapshot();
    const key = this.requireApiKey();
    const response = await fetch(`${this.baseUrl()}/v1beta/interactions?alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
        'Api-Revision': '2026-05-20',
      },
      signal: request.abortSignal,
      body: JSON.stringify({
        model: snapshot.geminiModel.replace(/^models\//, ''),
        stream: true,
        store: false,
        system_instruction: snapshot.systemPrompt,
        input: request.messages.map((message) =>
          message.role === 'assistant'
            ? {
                type: 'model_output',
                content: [{ type: 'text', text: message.content }],
              }
            : {
                type: 'user_input',
                content: message.content,
              },
        ),
      }),
    });

    if (!response.ok) {
      throw new Error(await readHttpError(response, 'Gemini request failed'));
    }

    await readSseStream(response, request.abortSignal, (payload) => {
      const event = JSON.parse(payload) as GeminiInteractionEvent;
      if (event.error?.message) {
        throw new Error(event.error.message);
      }
      const kind = event.event_type ?? event.type;
      if (kind !== 'step.delta') {
        return;
      }
      if (event.delta?.type === 'text' && event.delta.text) {
        request.onToken(event.delta.text);
      }
    });
  }

  private requireApiKey(): string {
    return requireMatchingKey('gemini', this.settings.snapshot().geminiApiKey);
  }

  private baseUrl(): string {
    return '/llm/gemini';
  }
}
