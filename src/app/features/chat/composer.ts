import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-composer',
  template: `
    <form class="bar" (submit)="submit($event)">
      <label class="sr-only" for="prompt">Message Kalai</label>
      <textarea
        id="prompt"
        name="prompt"
        rows="2"
        [value]="draft()"
        [disabled]="busy()"
        placeholder="Ask Kalai anything…"
        (input)="onInput($event)"
        (keydown.enter)="onEnter($event)"
      ></textarea>
      <button type="submit" [disabled]="busy() || !draft().trim()">Send</button>
    </form>
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem 1.5rem 1.25rem;
    }

    .bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      align-items: end;
      padding: 0.75rem;
      border: 1px solid var(--line);
      border-radius: 1.25rem;
      background: var(--panel);
    }

    textarea,
    button {
      font: inherit;
    }

    textarea {
      resize: none;
      border: 0;
      background: transparent;
      color: inherit;
      min-height: 3.2rem;
      padding: 0.45rem 0.4rem;
    }

    textarea:focus {
      outline: none;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 0.7rem 1.1rem;
      background: var(--accent);
      color: #1a140d;
      font-weight: 600;
    }

    button:disabled {
      opacity: 0.45;
    }
  `,
})
export class Composer {
  readonly sent = output<string>();
  readonly busy = input(false);
  readonly draft = signal('');

  submit(event: Event): void {
    event.preventDefault();
    const value = this.draft().trim();
    if (!value || this.busy()) {
      return;
    }
    this.sent.emit(value);
    this.draft.set('');
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }
    keyboardEvent.preventDefault();
    this.submit(keyboardEvent);
  }
}
