import { Component, inject, input, output, signal } from '@angular/core';
import { AuthStore } from '../../core/services/auth-store';

@Component({
  selector: 'app-totp-form',
  template: `
    <form class="totp" (submit)="submit($event)">
      <label>
        Authenticator code
        <input
          name="totp"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="123456"
          [value]="code()"
          (input)="onInput($event)"
        />
      </label>
      @if (auth.error(); as error) {
        <p class="warn" role="alert">{{ error }}</p>
      }
      <button type="submit" class="save" [disabled]="code().length !== 6">Verify</button>
    </form>
  `,
  styles: `
    .totp {
      display: grid;
      gap: 0.75rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.88rem;
    }

    input,
    button {
      font: inherit;
      color: inherit;
    }

    input {
      border: 1px solid var(--line);
      background: var(--bg);
      border-radius: 0.85rem;
      padding: 0.7rem 0.8rem;
      letter-spacing: 0.28em;
      font-size: 1.2rem;
    }

    .save {
      border: 0;
      border-radius: 999px;
      padding: 0.75rem 1rem;
      background: var(--accent);
      color: #1a140d;
      font-weight: 600;
    }

    .save:disabled {
      opacity: 0.45;
    }

    .warn {
      margin: 0;
      color: #f0b4a6;
    }
  `,
})
export class TotpForm {
  readonly mode = input<'login' | 'setup' | 'key'>('login');
  readonly verified = output();
  readonly auth = inject(AuthStore);
  readonly code = signal('');

  onInput(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6));
  }

  submit(event: Event): void {
    event.preventDefault();
    const code = this.code();
    const ok =
      this.mode() === 'setup'
        ? this.auth.confirmSetup(code)
        : this.mode() === 'key'
          ? this.auth.unlockKeyChange(code)
          : this.auth.login(code);
    if (ok) {
      this.code.set('');
      this.verified.emit();
    }
  }
}
