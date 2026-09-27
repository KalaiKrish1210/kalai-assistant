export function createId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

export function titleFromPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'New chat';
  }
  return compact.length > 42 ? `${compact.slice(0, 42)}…` : compact;
}

export async function readHttpError(response: Response, fallback: string): Promise<string> {
  const body = await response.text();
  if (!body) {
    return `${fallback} (${response.status})`;
  }

  try {
    const parsed = JSON.parse(body) as {
      error?: string | { message?: string };
      message?: string;
    };
    if (typeof parsed.error === 'string') {
      return parsed.error;
    }
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
      return parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    return body.slice(0, 280);
  }

  return `${fallback} (${response.status})`;
}

export async function readSseStream(
  response: Response,
  abortSignal: AbortSignal,
  onData: (payload: string) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No streaming response was returned.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (!abortSignal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      for (const line of event.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }
        onData(payload);
      }
    }
  }
}

export async function readNdjsonStream(
  response: Response,
  abortSignal: AbortSignal,
  onJson: (payload: unknown) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No streaming response was returned.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (!abortSignal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      onJson(JSON.parse(trimmed));
    }
  }
}
