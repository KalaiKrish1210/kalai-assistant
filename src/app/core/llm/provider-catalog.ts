import { CloudLlmProvider, LlmProvider } from '../models/assistant';

export interface ProviderProfile {
  id: LlmProvider;
  name: string;
  kind: 'cloud' | 'local';
  keyPrefixes: string[];
  defaultModel: string;
  modelKey: keyof Pick<
    import('../models/assistant').AssistantSettings,
    'geminiModel' | 'grokModel' | 'groqModel' | 'ollamaModel'
  >;
  keyUrl?: string;
  keyHint: string;
  help: string;
}

export const PROVIDER_CATALOG: readonly ProviderProfile[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    kind: 'cloud',
    keyPrefixes: ['AIza', 'AQ.'],
    defaultModel: 'gemini-3.6-flash',
    modelKey: 'geminiModel',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza… or AQ.…',
    help: 'Google AI Studio free key. Starts with AIza or AQ.',
  },
  {
    id: 'grok',
    name: 'Grok',
    kind: 'cloud',
    keyPrefixes: ['xai-'],
    defaultModel: 'grok-3-mini',
    modelKey: 'grokModel',
    keyUrl: 'https://console.x.ai/',
    keyHint: 'xai-…',
    help: 'xAI Grok key from console.x.ai. Starts with xai-.',
  },
  {
    id: 'groq',
    name: 'Groq',
    kind: 'cloud',
    keyPrefixes: ['gsk_'],
    defaultModel: 'openai/gpt-oss-120b',
    modelKey: 'groqModel',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_…',
    help: 'Groq Cloud free key. Starts with gsk_. Default model is openai/gpt-oss-120b.',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    kind: 'local',
    keyPrefixes: [],
    defaultModel: 'llama3.2',
    modelKey: 'ollamaModel',
    keyHint: '',
    help: 'Local models. No API key.',
  },
] as const;

export type CloudApiKeyField = 'geminiApiKey' | 'grokApiKey' | 'groqApiKey';

export function providerProfile(id: LlmProvider): ProviderProfile {
  return PROVIDER_CATALOG.find((item) => item.id === id) ?? PROVIDER_CATALOG[0];
}

export function cloudApiKeyField(provider: LlmProvider): CloudApiKeyField | null {
  switch (provider) {
    case 'gemini':
      return 'geminiApiKey';
    case 'grok':
      return 'grokApiKey';
    case 'groq':
      return 'groqApiKey';
    default:
      return null;
  }
}

export function apiKeyFor(
  settings: Pick<import('../models/assistant').AssistantSettings, CloudApiKeyField | 'provider'>,
  provider: LlmProvider = settings.provider,
): string {
  const field = cloudApiKeyField(provider);
  return field ? settings[field] : '';
}

export function detectProviderFromApiKey(raw: string): CloudLlmProvider | null {
  const key = raw.trim().toLowerCase();
  if (!key) {
    return null;
  }

  for (const profile of PROVIDER_CATALOG) {
    if (profile.kind !== 'cloud') {
      continue;
    }
    if (profile.keyPrefixes.some((prefix) => key.startsWith(prefix.toLowerCase()))) {
      return profile.id as CloudLlmProvider;
    }
  }

  return null;
}

export function requireMatchingKey(provider: LlmProvider, raw: string): string {
  const apiKey = raw.trim();
  const profile = providerProfile(provider);
  if (profile.kind !== 'cloud') {
    return apiKey;
  }
  if (!apiKey) {
    throw new Error(
      `Add a ${profile.name} API key in Settings. Get one from ${profile.keyUrl ?? 'the provider console'}.`,
    );
  }

  const detected = detectProviderFromApiKey(apiKey);
  if (detected && detected !== provider) {
    const actual = providerProfile(detected);
    throw new Error(
      `This is a ${actual.name} key, not a ${profile.name} key. Select ${actual.name}, or paste a ${profile.name} key (${profile.keyHint}).`,
    );
  }
  if (!detected) {
    throw new Error(
      `${profile.name} keys start with ${profile.keyHint}. Get one from ${profile.keyUrl ?? 'the provider console'}.`,
    );
  }
  return apiKey;
}
