import { Service, computed, signal } from '@angular/core';
import { Conversation, ChatMessage } from '../models/assistant';
import { createId, now, titleFromPrompt } from '../utils/stream';

const STORAGE_KEY = 'kalai.assistant.conversations';

@Service()
export class ConversationStore {
  private readonly conversationsState = signal<Conversation[]>(loadConversations());
  private readonly activeIdState = signal<string | null>(firstId(loadConversations()));

  readonly conversations = this.conversationsState.asReadonly();
  readonly activeId = this.activeIdState.asReadonly();
  readonly active = computed(
    () => this.conversationsState().find((item) => item.id === this.activeIdState()) ?? null,
  );

  create(prompt?: string): Conversation {
    const createdAt = now();
    const conversation: Conversation = {
      id: createId(),
      title: prompt ? titleFromPrompt(prompt) : 'New chat',
      messages: [],
      createdAt,
      updatedAt: createdAt,
    };

    this.conversationsState.update((items) => [conversation, ...items]);
    this.activeIdState.set(conversation.id);
    this.persist();
    return conversation;
  }

  select(id: string): void {
    this.activeIdState.set(id);
  }

  remove(id: string): void {
    this.conversationsState.update((items) => items.filter((item) => item.id !== id));
    if (this.activeIdState() === id) {
      this.activeIdState.set(this.conversationsState()[0]?.id ?? null);
    }
    this.persist();
  }

  addUserMessage(content: string): { conversation: Conversation; message: ChatMessage } {
    const conversation = this.active() ?? this.create(content);
    const message: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
      createdAt: now(),
    };

    this.patchConversation(conversation.id, (current) => ({
      ...current,
      title: current.messages.length === 0 ? titleFromPrompt(content) : current.title,
      messages: [...current.messages, message],
      updatedAt: now(),
    }));

    return { conversation: this.active() ?? conversation, message };
  }

  startAssistantMessage(): ChatMessage {
    const conversation = this.active();
    if (!conversation) {
      throw new Error('No active conversation.');
    }

    const message: ChatMessage = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: now(),
      streaming: true,
    };

    this.patchConversation(conversation.id, (current) => ({
      ...current,
      messages: [...current.messages, message],
      updatedAt: now(),
    }));

    return message;
  }

  appendAssistantToken(messageId: string, chunk: string): void {
    const conversation = this.active();
    if (!conversation) {
      return;
    }

    this.patchConversation(
      conversation.id,
      (current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId ? { ...message, content: message.content + chunk } : message,
        ),
        updatedAt: now(),
      }),
      false,
    );
  }

  finishAssistantMessage(messageId: string, content?: string): void {
    const conversation = this.active();
    if (!conversation) {
      return;
    }

    this.patchConversation(conversation.id, (current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === messageId
          ? { ...message, content: content ?? message.content, streaming: false }
          : message,
      ),
      updatedAt: now(),
    }));
  }

  dropEmptyAssistantMessage(messageId: string): void {
    const conversation = this.active();
    if (!conversation) {
      return;
    }

    this.patchConversation(conversation.id, (current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== messageId),
      updatedAt: now(),
    }));
  }

  private patchConversation(
    id: string,
    mutate: (current: Conversation) => Conversation,
    persist = true,
  ): void {
    this.conversationsState.update((items) =>
      items.map((item) => (item.id === id ? mutate(item) : item)),
    );
    if (persist) {
      this.persist();
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversationsState()));
  }
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function firstId(items: Conversation[]): string | null {
  return items[0]?.id ?? null;
}
