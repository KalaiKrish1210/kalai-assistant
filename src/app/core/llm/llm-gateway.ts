import { Service, inject } from '@angular/core';
import { SettingsStore } from '../services/settings-store';
import { GeminiClient } from './gemini-client';
import { GrokClient } from './grok-client';
import { GroqClient } from './groq-client';
import { LlmClient } from './llm-client';
import { OllamaClient } from './ollama-client';

@Service()
export class LlmGateway {
  private readonly settings = inject(SettingsStore);
  private readonly clients = {
    ollama: inject(OllamaClient),
    gemini: inject(GeminiClient),
    grok: inject(GrokClient),
    groq: inject(GroqClient),
  } as const;

  client(): LlmClient {
    return this.clients[this.settings.provider()];
  }
}
