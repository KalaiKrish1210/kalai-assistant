import { Service, computed, inject, signal } from '@angular/core';
import { Secret, TOTP } from 'otpauth';
import { SettingsStore } from './settings-store';

export interface TotpSetup {
  secret: string;
  uri: string;
}

const PENDING_SECRET_KEY = 'kalai.pendingTotp';

@Service()
export class AuthStore {
  private readonly settings = inject(SettingsStore);
  private pendingSecret = '';

  readonly unlocked = signal(false);
  readonly keyChangeUnlocked = signal(false);
  readonly error = signal<string | null>(null);
  readonly configured = computed(() => this.settings.snapshot().totpSecret.trim().length > 0);

  createSetup(): TotpSetup {
    const stored = sessionStorage.getItem(PENDING_SECRET_KEY);
    const secret =
      stored && /^[A-Z2-7]+=*$/i.test(stored) ? stored : new Secret({ size: 20 }).base32;
    sessionStorage.setItem(PENDING_SECRET_KEY, secret);
    this.pendingSecret = secret;
    this.error.set(null);
    const totp = makeTotp(secret);
    return {
      secret,
      uri: totp.toString(),
    };
  }

  confirmSetup(code: string): boolean {
    if (!this.verifyCode(code, this.pendingSecret)) {
      this.error.set('That code is not valid. Wait for a new one and try again.');
      return false;
    }
    this.settings.update({ totpSecret: this.pendingSecret });
    this.pendingSecret = '';
    sessionStorage.removeItem(PENDING_SECRET_KEY);
    this.unlocked.set(true);
    this.error.set(null);
    void this.settings.saveToPropertiesFile();
    return true;
  }

  login(code: string): boolean {
    if (!this.verifyCode(code, this.settings.snapshot().totpSecret)) {
      this.error.set('Invalid authenticator code.');
      return false;
    }
    this.unlocked.set(true);
    this.error.set(null);
    return true;
  }

  unlockKeyChange(code: string): boolean {
    if (!this.verifyCode(code, this.settings.snapshot().totpSecret)) {
      this.error.set('Invalid authenticator code.');
      return false;
    }
    this.keyChangeUnlocked.set(true);
    this.error.set(null);
    return true;
  }

  lockKeyChange(): void {
    this.keyChangeUnlocked.set(false);
    this.error.set(null);
  }

  logout(): void {
    this.unlocked.set(false);
    this.keyChangeUnlocked.set(false);
    this.error.set(null);
  }

  private verifyCode(code: string, secret: string): boolean {
    const token = code.replace(/\s+/g, '');
    if (!secret || !/^\d{6}$/.test(token)) {
      return false;
    }
    return makeTotp(secret).validate({ token, window: 1 }) !== null;
  }
}

function makeTotp(secret: string): TOTP {
  return new TOTP({
    issuer: 'Kalai',
    label: 'Assistant',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}
