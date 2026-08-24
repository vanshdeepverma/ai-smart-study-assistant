export interface ChatMessageInput {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
}

export interface AIProvider {
  /**
   * Initialize the provider with necessary configuration/keys.
   */
  initialize(): void;

  /**
   * Stream a chat response given the conversation history and a system prompt.
   */
  streamChat(
    history: ChatMessageInput[],
    systemInstruction?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Generate structured JSON output from a prompt.
   */
  generateJson(
    prompt: string,
    options?: { temperature?: number; responseSchema?: object }
  ): Promise<string>;
}
