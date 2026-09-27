import { Service, inject, resource, signal } from '@angular/core';
import { ConversationStore } from './conversation-store';
import { SettingsStore } from './settings-store';
import { LlmGateway } from '../llm/llm-gateway';

@Service()
export class ChatSession {
  private readonly conversations = inject(ConversationStore);
  private readonly settings = inject(SettingsStore);
  private readonly gateway = inject(LlmGateway);

  private abort?: AbortController;

  readonly isStreaming = signal(false);
  readonly error = signal<string | null>(null);

  readonly models = resource({
    params: () => ({
      provider: this.settings.provider(),
      apiKey: this.settings.activeApiKey(),
      ollamaUrl: this.settings.snapshot().ollamaBaseUrl,
      model: this.settings.activeModel(),
    }),
    loader: async ({ abortSignal }) => {
      try {
        return await this.gateway.client().listModels(abortSignal);
      } catch {
        return [] as string[];
      }
    },
  });

  async send(prompt: string): Promise<void> {
    const content = prompt.trim();
    if (!content || this.isStreaming()) {
      return;
    }

    this.error.set(null);
    this.abort?.abort();
    this.abort = new AbortController();

    this.conversations.addUserMessage(content);
    const assistant = this.conversations.startAssistantMessage();
    const history =
      this.conversations.active()?.messages.filter((message) => message.id !== assistant.id) ?? [];
    this.isStreaming.set(true);

    try {
      await this.gateway.client().stream({
        messages: history.map((message) => ({ role: message.role, content: message.content })),
        abortSignal: this.abort.signal,
        onToken: (chunk) => this.conversations.appendAssistantToken(assistant.id, chunk),
      });
      this.conversations.finishAssistantMessage(assistant.id);
    } catch (error) {
      if (isAbortError(error)) {
        this.conversations.finishAssistantMessage(assistant.id);
        return;
      }

      const message = error instanceof Error ? error.message : 'The model request failed.';
      this.error.set(message);
      if (!this.conversations.active()?.messages.find((item) => item.id === assistant.id)?.content) {
        this.conversations.dropEmptyAssistantMessage(assistant.id);
      } else {
        this.conversations.finishAssistantMessage(assistant.id);
      }
    } finally {
      this.isStreaming.set(false);
    }
  }

  stop(): void {
    this.abort?.abort();
    this.isStreaming.set(false);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
