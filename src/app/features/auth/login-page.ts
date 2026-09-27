import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TotpForm } from './totp-form';

@Component({
  selector: 'app-login-page',
  imports: [TotpForm],
  template: `
    <main class="gate">
      <section class="card">
        <p class="eyebrow">Kalai Assistant</p>
        <h1>Enter your Google Authenticator code</h1>
        <p>Open Google Authenticator and type the 6-digit code for Kalai.</p>
        <app-totp-form mode="login" (verified)="enter()" />
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .gate {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.25rem;
    }

    .card {
      width: min(28rem, 100%);
      display: grid;
      gap: 0.85rem;
      padding: 1.4rem;
      border: 1px solid var(--line);
      border-radius: 1.4rem;
      background: var(--panel);
    }

    .eyebrow,
    p {
      margin: 0;
      color: var(--muted);
    }

    h1 {
      margin: 0;
      font-family: var(--serif);
      font-size: 1.8rem;
      font-weight: 500;
    }
  `,
})
export class LoginPage {
  private readonly router = inject(Router);

  enter(): void {
    void this.router.navigateByUrl('/');
  }
}
