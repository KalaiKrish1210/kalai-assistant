import { readHttpError, readSseStream } from '../utils/stream';

interface OpenAiModelsResponse {
  data?: Array<{ id?: string }>;
}

interface OpenAiChunk {
  choices?: Array<{
    delta?: { content?: string };
  }>;
  error?: { message?: string };
}

export async function listOpenAiModels(
  url: string,
  apiKey: string,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: abortSignal,
  });
  if (!response.ok) {
    throw new Error(await readHttpError(response, 'Could not list models'));
  }

  const payload = (await response.json()) as OpenAiModelsResponse;
  return (payload.data ?? []).map((item) => item.id).filter((id): id is string => !!id);
}

export async function streamOpenAiChat(options: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  abortSignal: AbortSignal;
  onToken: (chunk: string) => void;
}): Promise<void> {
  const response = await fetch(options.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    signal: options.abortSignal,
    body: JSON.stringify({
      model: options.model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...options.messages,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await readHttpError(response, 'Chat request failed'));
  }

  await readSseStream(response, options.abortSignal, (payload) => {
    const chunk = JSON.parse(payload) as OpenAiChunk;
    if (chunk.error?.message) {
      throw new Error(chunk.error.message);
    }
    const token = chunk.choices?.[0]?.delta?.content ?? '';
    if (token) {
      options.onToken(token);
    }
  });
}
