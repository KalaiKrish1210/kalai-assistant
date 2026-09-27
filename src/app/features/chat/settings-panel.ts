import { Component, computed, DestroyRef, inject, output } from '@angular/core';
import { TotpForm } from '../auth/totp-form';
import { LlmProvider } from '../../core/models/assistant';
import { PROVIDER_CATALOG, providerProfile } from '../../core/llm/provider-catalog';
import { AuthStore } from '../../core/services/auth-store';
import { ChatSession } from '../../core/services/chat-session';
import { SettingsStore } from '../../core/services/settings-store';

@Component({
  selector: 'app-settings-panel',
  imports: [TotpForm],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
  host: {
    '(click)': 'closed.emit()',
  },
})
export class SettingsPanel {
  readonly closed = output();
  readonly settings = inject(SettingsStore);
  readonly auth = inject(AuthStore);
  readonly session = inject(ChatSession);
  readonly providers = PROVIDER_CATALOG;
  private readonly savedKeysAtOpen = {
    gemini: !!this.settings.snapshot().geminiApiKey.trim(),
    grok: !!this.settings.snapshot().grokApiKey.trim(),
    groq: !!this.settings.snapshot().groqApiKey.trim(),
  };
  readonly canEditKey = computed(() => {
    if (this.auth.keyChangeUnlocked()) {
      return true;
    }
    const provider = this.settings.provider();
    if (provider === 'ollama') {
      return true;
    }
    return !this.savedKeysAtOpen[provider];
  });
  readonly maskedKey = computed(() => maskApiKey(this.settings.activeApiKey()));
  readonly detected = computed(() => {
    const id = this.settings.detectedProvider();
    return id ? providerProfile(id) : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.auth.lockKeyChange());
  }

  setProvider(provider: LlmProvider): void {
    this.settings.setProvider(provider);
  }

  onApiKey(event: Event): void {
    this.settings.applyApiKey((event.target as HTMLInputElement).value);
  }

  onModel(event: Event): void {
    this.settings.updateModel((event.target as HTMLInputElement).value);
  }

  onOllamaUrl(event: Event): void {
    this.settings.update({ ollamaBaseUrl: (event.target as HTMLInputElement).value });
  }

  onSystemPrompt(event: Event): void {
    this.settings.update({ systemPrompt: (event.target as HTMLTextAreaElement).value });
  }

  save(): void {
    void this.settings.saveToPropertiesFile();
  }
}

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length < 8) {
    return '••••••••';
  }
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
