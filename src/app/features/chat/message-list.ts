import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ConversationStore } from '../../core/services/conversation-store';
import { MessageBubble } from './message-bubble';

@Component({
  selector: 'app-message-list',
  imports: [MessageBubble],
  template: `
    <div class="scroller" #scroller>
      @if (conversation.active(); as active) {
        @for (message of active.messages; track message.id) {
          <app-message-bubble [message]="message" />
        } @empty {
          <div class="hero">
            <h1>What can I help with?</h1>
            <p>Private chat with Gemini or a local Ollama model. Switch providers anytime.</p>
          </div>
        }
      } @else {
        <div class="hero">
          <h1>What can I help with?</h1>
          <p>Start a new chat and ask Kalai to draft, plan, summarize, or think something through.</p>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 0;
      overflow: hidden;
    }

    .scroller {
      height: 100%;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.25rem 1.5rem 0.5rem;
    }

    .hero {
      margin: auto;
      text-align: center;
      max-width: 36rem;
    }

    h1 {
      margin: 0 0 0.6rem;
      font-family: var(--serif);
      font-size: clamp(2rem, 4vw, 3.1rem);
      font-weight: 500;
    }

    p {
      margin: 0;
      color: var(--muted);
    }
  `,
})
export class MessageList {
  readonly conversation = inject(ConversationStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    effect(() => {
      const active = this.conversation.active();
      const last = active?.messages.at(-1);
      void last?.content;
      queueMicrotask(() => {
        const element = this.scroller()?.nativeElement;
        element?.scrollTo({ top: element.scrollHeight });
      });
    });
  }
}
