import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ConversationStore } from '../../core/services/conversation-store';

@Component({
  selector: 'app-conversation-sidebar',
  imports: [DatePipe],
  template: `
    <div class="brand">
      <span class="mark" aria-hidden="true"></span>
      <div>
        <p class="name">Kalai</p>
        <p class="hint">Personal assistant</p>
      </div>
    </div>

    <button type="button" class="new" (click)="conversations.create()">New chat</button>

    <nav class="list" aria-label="Conversations">
      @for (conversation of conversations.conversations(); track conversation.id) {
        <div class="item" [class.active]="conversation.id === conversations.activeId()">
          <button type="button" class="open" (click)="conversations.select(conversation.id)">
            <span class="title">{{ conversation.title }}</span>
            <span class="meta">{{ conversation.updatedAt | date: 'MMM d' }}</span>
          </button>
          <button type="button" class="delete" (click)="conversations.remove(conversation.id)">
            Delete
          </button>
        </div>
      } @empty {
        <p class="empty">Start a conversation and it will appear here.</p>
      }
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
      padding: 1.25rem 1rem;
      background: var(--panel);
      border-right: 1px solid var(--line);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .mark {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.8rem;
      background:
        radial-gradient(circle at 30% 30%, #f3eadf 0 18%, transparent 19%),
        linear-gradient(135deg, #e0a45a, #7d5a32);
    }

    .name {
      margin: 0;
      font-family: var(--serif);
      font-size: 1.35rem;
    }

    .hint,
    .empty,
    .meta {
      margin: 0;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .new,
    .item {
      width: 100%;
      border: 1px solid var(--line);
      background: transparent;
      color: inherit;
      text-align: left;
    }

    .new {
      border-radius: 999px;
      padding: 0.7rem 1rem;
      font-weight: 600;
      background: var(--accent-soft);
      border-color: transparent;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      overflow: auto;
      min-height: 0;
    }

    .item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.2rem 0.6rem;
      border-radius: 0.9rem;
      padding: 0.35rem;
      border: 1px solid var(--line);
    }

    .item.active,
    .item:hover,
    .new:hover,
    .open:hover {
      background: var(--panel-2);
    }

    .open,
    .delete {
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
    }

    .open {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.2rem 0.6rem;
      width: 100%;
      padding: 0.5rem 0.5rem 0.15rem;
    }

    .title {
      font-size: 0.92rem;
    }

    .delete {
      grid-column: 1 / -1;
      color: var(--muted);
      font-size: 0.72rem;
      padding: 0 0.5rem 0.4rem;
      width: max-content;
    }
  `,
})
export class ConversationSidebar {
  readonly conversations = inject(ConversationStore);
}
