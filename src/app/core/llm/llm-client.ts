import { LlmProvider, StreamChatRequest } from '../models/assistant';

export interface LlmClient {
  readonly id: LlmProvider;
  listModels(abortSignal?: AbortSignal): Promise<string[]>;
  stream(request: StreamChatRequest): Promise<void>;
}
