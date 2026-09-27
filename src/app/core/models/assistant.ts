export type CloudLlmProvider = 'gemini' | 'grok' | 'groq';
export type LlmProvider = CloudLlmProvider | 'ollama';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Exclude<ChatRole, 'system'>;
  content: string;
  createdAt: number;
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AssistantSettings {
  provider: LlmProvider;
  geminiApiKey: string;
  grokApiKey: string;
  groqApiKey: string;
  totpSecret: string;
  geminiModel: string;
  grokModel: string;
  groqModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  systemPrompt: string;
}

export interface ChatTurn {
  role: Exclude<ChatRole, 'system'>;
  content: string;
}

export interface StreamChatRequest {
  messages: ChatTurn[];
  abortSignal: AbortSignal;
  onToken: (chunk: string) => void;
}
