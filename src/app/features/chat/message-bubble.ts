import { Component, input } from '@angular/core';
import { ChatMessage } from '../../core/models/assistant';
import { ChatTextPipe } from '../../shared/pipes/chat-text-pipe';

@Component({
  selector: 'app-message-bubble',
  imports: [ChatTextPipe],
  template: `
    <article class="bubble" [class.user]="message().role === 'user'">
      <p class="role">{{ message().role === 'user' ? 'You' : 'Kalai' }}</p>
      @if (message().content) {
        <div class="body" [innerHTML]="message().content | chatText"></div>
      } @else if (message().streaming) {
        <p class="body pending">Thinking…</p>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .bubble {
      max-width: min(72ch, 100%);
      padding: 0.95rem 1.05rem;
      border-radius: 1.1rem 1.1rem 1.1rem 0.35rem;
      background: var(--assistant);
    }

    .user {
      margin-inline-start: auto;
      border-radius: 1.1rem 1.1rem 0.35rem 1.1rem;
      background: var(--user);
    }

    .role {
      margin: 0 0 0.35rem;
      color: var(--muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .body {
      margin: 0;
      line-height: 1.55;
    }

    .pending {
      color: var(--muted);
    }

    :host ::ng-deep code {
      font-size: 0.88em;
      padding: 0.1em 0.35em;
      border-radius: 0.35rem;
      background: rgb(255 255 255 / 0.08);
    }
  `,
})
export class MessageBubble {
  readonly message = input.required<ChatMessage>();
}
