import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as QrCodeNs from 'qrcode';
import { AuthStore } from '../../core/services/auth-store';
import { TotpForm } from './totp-form';

type QrDataUrl = (text: string, options?: { margin?: number; width?: number }) => Promise<string>;

function toQrDataUrl(uri: string): Promise<string> {
  const mod = QrCodeNs as unknown as { toDataURL?: QrDataUrl; default?: { toDataURL?: QrDataUrl } };
  const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
  if (!toDataURL) {
    return Promise.reject(new Error('QR generator unavailable'));
  }
  return toDataURL(uri, { margin: 1, width: 240 });
}

@Component({
  selector: 'app-setup-page',
  imports: [TotpForm],
  template: `
    <main class="gate">
      <section class="card">
        <p class="eyebrow">First-time setup</p>
        <h1>Protect Kalai with Google Authenticator</h1>
        <p>Scan this QR code in Google Authenticator, then enter the 6-digit code to confirm.</p>
        @if (qr()) {
          <img class="qr" [src]="qr()" alt="Google Authenticator QR code" />
        }
        <p class="secret">Manual key: <code>{{ secret() }}</code></p>
        <app-totp-form mode="setup" (verified)="enter()" />
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
      width: min(32rem, 100%);
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

    .qr {
      width: 12.5rem;
      height: 12.5rem;
      justify-self: center;
      padding: 0.6rem;
      background: #fff;
      border-radius: 0.8rem;
    }

    .secret code {
      color: var(--text);
      word-break: break-all;
    }
  `,
})
export class SetupPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly secret = signal('');
  readonly qr = signal('');

  constructor() {
    const setup = this.auth.createSetup();
    this.secret.set(setup.secret);
    void toQrDataUrl(setup.uri)
      .then((url) => this.qr.set(url))
      .catch(() => this.qr.set(''));
  }

  enter(): void {
    void this.router.navigateByUrl('/');
  }
}
