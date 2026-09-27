import { Service, computed, signal } from '@angular/core';
import { fromProperties, toProperties } from '../config/properties';
import { apiKeyFor, cloudApiKeyField, detectProviderFromApiKey, providerProfile } from '../llm/provider-catalog';
import { AssistantSettings, CloudLlmProvider, LlmProvider } from '../models/assistant';

const STORAGE_KEY = 'kalai.assistant.settings';
const PROPERTIES_URL = '/kalai.properties';
const SAVE_URL = '/kalai/save-properties';

export const DEFAULT_SETTINGS: AssistantSettings = {
  provider: 'gemini',
  geminiApiKey: '',
  grokApiKey: '',
  groqApiKey: '',
  totpSecret: '',
  geminiModel: 'gemini-3.6-flash',
  grokModel: 'grok-3-mini',
  groqModel: 'openai/gpt-oss-120b',
  ollamaBaseUrl: '/llm/ollama',
  ollamaModel: 'llama3.2',
  systemPrompt:
    'You are Kalai, a private personal assistant. Be concise, practical, and honest. Prefer clear next steps. If you are unsure, say so.',
};

@Service()
export class SettingsStore {
  private readonly state = signal<AssistantSettings>(loadLocalSettings());

  readonly snapshot = this.state.asReadonly();
  readonly provider = computed(() => this.state().provider);
  readonly profile = computed(() => providerProfile(this.state().provider));
  readonly activeApiKey = computed(() => apiKeyFor(this.state()));
  readonly detectedProvider = computed(() => detectProviderFromApiKey(this.activeApiKey()));
  readonly activeModel = computed(() => this.state()[this.profile().modelKey]);
  readonly saveMessage = signal<string | null>(null);
  readonly saveError = signal(false);

  update(patch: Partial<AssistantSettings>): void {
    this.state.update((current) => ({ ...current, ...patch }));
    this.saveMessage.set(null);
    if (patch.totpSecret !== undefined) {
      persistLocal(this.snapshot());
    }
  }

  setProvider(provider: LlmProvider): void {
    this.update({ provider });
  }

  applyApiKey(apiKey: string): void {
    const detected = detectProviderFromApiKey(apiKey);
    const current = this.provider();
    const target: CloudLlmProvider | null =
      detected ?? (current === 'ollama' ? null : current);
    if (!target) {
      return;
    }
    const field = cloudApiKeyField(target);
    if (!field) {
      return;
    }
    const previousField = cloudApiKeyField(current);
    this.update({
      [field]: apiKey,
      ...(detected ? { provider: detected } : {}),
      ...(detected && previousField && previousField !== field ? { [previousField]: '' } : {}),
    });
  }

  updateModel(model: string): void {
    this.update({ [this.profile().modelKey]: model });
  }

  async loadFromPropertiesFile(): Promise<void> {
    try {
      const response = await fetch(PROPERTIES_URL, { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const patch = fromProperties(await response.text());
      if (!Object.keys(patch).length) {
        return;
      }
      this.state.update((current) => normalizeSettings({ ...current, ...patch }));
    } catch {
      // Keep local settings if the properties file is missing.
    }
  }

  async saveToPropertiesFile(): Promise<void> {
    const settings = this.snapshot();
    persistLocal(settings);
    const body = toProperties(settings);

    try {
      const response = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
      });
      if (!response.ok) {
        throw new Error('Could not write kalai.properties');
      }
      const payload = (await response.json().catch(() => null)) as { path?: string } | null;
      this.saveError.set(false);
      this.saveMessage.set(`Saved to ${payload?.path ?? 'kalai.properties'}`);
    } catch {
      this.saveError.set(true);
      this.saveMessage.set('Saved on this computer in the browser only. Use the desktop app or npm start to write kalai.properties.');
    }
  }
}

const RETIRED_GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'models/gemini-2.5-flash',
  'models/gemini-2.5-flash-lite',
  'models/gemini-2.0-flash',
]);

const RETIRED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

function normalizeSettings(
  settings: AssistantSettings & { apiKey?: string; geminiApiKey?: string },
): AssistantSettings {
  const migrated = migrateLegacyApiKey(settings);
  const geminiModel = migrated.geminiModel.replace(/^models\//, '');
  return {
    ...migrated,
    geminiModel: RETIRED_GEMINI_MODELS.has(migrated.geminiModel)
      ? DEFAULT_SETTINGS.geminiModel
      : geminiModel,
    groqModel: RETIRED_GROQ_MODELS.has(migrated.groqModel)
      ? DEFAULT_SETTINGS.groqModel
      : migrated.groqModel,
  };
}

function migrateLegacyApiKey(
  settings: AssistantSettings & { apiKey?: string },
): AssistantSettings {
  const { apiKey, ...rest } = settings;
  const next: AssistantSettings = {
    ...DEFAULT_SETTINGS,
    ...rest,
    geminiApiKey: rest.geminiApiKey ?? '',
    grokApiKey: rest.grokApiKey ?? '',
    groqApiKey: rest.groqApiKey ?? '',
  };
  if (!apiKey?.trim()) {
    return next;
  }
  const detected = detectProviderFromApiKey(apiKey);
  const fallback = next.provider === 'ollama' ? 'gemini' : next.provider;
  const field = cloudApiKeyField(detected ?? fallback);
  if (field && !next[field].trim()) {
    next[field] = apiKey.trim();
    if (detected) {
      next.provider = detected;
    }
  }
  return relocateMismatchedKeys(next);
}

function relocateMismatchedKeys(settings: AssistantSettings): AssistantSettings {
  const next = { ...settings };
  for (const provider of ['gemini', 'grok', 'groq'] as const) {
    const field = cloudApiKeyField(provider);
    if (!field) {
      continue;
    }
    const key = next[field].trim();
    if (!key) {
      continue;
    }
    const detected = detectProviderFromApiKey(key);
    if (!detected || detected === provider) {
      continue;
    }
    const destination = cloudApiKeyField(detected);
    if (destination && !next[destination].trim()) {
      next[destination] = key;
      next[field] = '';
    }
  }
  return next;
}

function persistLocal(settings: AssistantSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadLocalSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<AssistantSettings> & { apiKey?: string };
    return normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...parsed,
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}
