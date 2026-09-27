import { apiKeyFor, cloudApiKeyField, detectProviderFromApiKey } from '../llm/provider-catalog';
import { AssistantSettings, LlmProvider } from '../models/assistant';

const PROVIDERS: readonly LlmProvider[] = ['gemini', 'grok', 'groq', 'ollama'];

export function toProperties(settings: AssistantSettings): string {
  return [
    '# Kalai Assistant',
    '# Generated from Settings. Do not commit provider keys.',
    `gemini.key=${escapeValue(settings.geminiApiKey)}`,
    `grok.key=${escapeValue(settings.grokApiKey)}`,
    `groq.key=${escapeValue(settings.groqApiKey)}`,
    `api.key=${escapeValue(apiKeyFor(settings))}`,
    `auth.secret=${escapeValue(settings.totpSecret)}`,
    `provider=${settings.provider}`,
    `gemini.model=${escapeValue(settings.geminiModel)}`,
    `grok.model=${escapeValue(settings.grokModel)}`,
    `groq.model=${escapeValue(settings.groqModel)}`,
    `ollama.baseUrl=${escapeValue(settings.ollamaBaseUrl)}`,
    `ollama.model=${escapeValue(settings.ollamaModel)}`,
    `system.prompt=${escapeValue(settings.systemPrompt)}`,
    '',
  ].join('\n');
}

export function fromProperties(text: string): Partial<AssistantSettings> {
  const values = parseProperties(text);
  const patch: Partial<AssistantSettings> = {};
  const totpSecret = values.get('auth.secret');
  const provider = values.get('provider');
  const geminiModel = values.get('gemini.model');
  const grokModel = values.get('grok.model');
  const groqModel = values.get('groq.model');
  const ollamaBaseUrl = values.get('ollama.baseUrl');
  const ollamaModel = values.get('ollama.model');
  const systemPrompt = values.get('system.prompt');
  const geminiKey = values.get('gemini.key');
  const grokKey = values.get('grok.key');
  const groqKey = values.get('groq.key');
  const legacyKey = stripKey(values.get('api.key'));

  if (geminiKey !== undefined) {
    patch.geminiApiKey = stripKey(geminiKey);
  }
  if (grokKey !== undefined) {
    patch.grokApiKey = stripKey(grokKey);
  }
  if (groqKey !== undefined) {
    patch.groqApiKey = stripKey(groqKey);
  }
  if (totpSecret?.trim()) {
    patch.totpSecret = totpSecret.trim();
  }
  if (provider && PROVIDERS.includes(provider as LlmProvider)) {
    patch.provider = provider as LlmProvider;
  }
  const hasSpecificKeys =
    geminiKey !== undefined || grokKey !== undefined || groqKey !== undefined;
  if (legacyKey) {
    const detected = detectProviderFromApiKey(legacyKey);
    const field = cloudApiKeyField(detected ?? patch.provider ?? 'gemini');
    if (field && !patch[field]?.trim()) {
      patch[field] = legacyKey;
      if (detected && (!hasSpecificKeys || !patch.provider)) {
        patch.provider = detected;
      }
    }
  }
  if (geminiModel) {
    patch.geminiModel = geminiModel.replace(/^models\//, '');
  }
  if (grokModel) {
    patch.grokModel = grokModel;
  }
  if (groqModel) {
    patch.groqModel = groqModel;
  }
  if (ollamaBaseUrl) {
    patch.ollamaBaseUrl = ollamaBaseUrl;
  }
  if (ollamaModel) {
    patch.ollamaModel = ollamaModel;
  }
  if (systemPrompt) {
    patch.systemPrompt = systemPrompt;
  }
  return patch;
}

function stripKey(value: string | undefined): string {
  return (value ?? '').replace(/^["']|["']$/g, '').trim();
}

function parseProperties(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator < 1) {
      continue;
    }
    values.set(line.slice(0, separator).trim(), unescapeValue(line.slice(separator + 1)));
  }
  return values;
}

function escapeValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n');
}

function unescapeValue(value: string): string {
  return value.replace(/\\(.)/g, (_match, ch: string) => (ch === 'n' ? '\n' : ch));
}
