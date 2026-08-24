import { GoogleGenAI, Content } from '@google/genai';
import { AIProvider, ChatMessageInput } from './AIProvider.interface';
import { config } from '../../config/env';

export class GeminiProvider implements AIProvider {
  private ai!: GoogleGenAI;
  private modelName = config.ai.geminiModel;

  initialize(): void {
    const apiKey = config.ai.geminiKey;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is missing. AI endpoints will fail.');
      this.ai = new GoogleGenAI({}); 
    } else {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async *streamChat(
    history: ChatMessageInput[],
    systemInstruction?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncGenerator<string, void, unknown> {
    
    if (!config.ai.geminiKey) {
      yield "[ERROR] Gemini API key is missing. Please configure GEMINI_API_KEY in the backend .env file.";
      return;
    }

    try {
      const contents: Content[] = history
        .filter(msg => msg.role !== 'SYSTEM')
        .map(msg => ({
          role: msg.role === 'ASSISTANT' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      const config: any = {};

      if (options?.maxTokens) {
        config.maxOutputTokens = options.maxTokens;
      }

      if (systemInstruction) {
        config.systemInstruction = {
          role: 'system',
          parts: [{ text: systemInstruction }]
        };
      }

      const stream = await this.ai.models.generateContentStream({
        model: this.modelName,
        contents: contents,
        config: config
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error: any) {
      console.error('GeminiProvider Error:', error);
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('AI_QUOTA_EXCEEDED');
      }
      throw new Error('AI_PROVIDER_ERROR');
    }
  }

  /**
   * Generate structured JSON output using Gemini API.
   */
  async generateJson(
    prompt: string,
    options?: { temperature?: number; responseSchema?: object }
  ): Promise<string> {
    if (!config.ai.geminiKey) {
      throw new Error('Gemini API key is missing.');
    }

    try {
      const config: any = {
        responseMimeType: 'application/json',
      };

      if (options?.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: config
      });

      if (!response.text) {
        throw new Error('Gemini API returned empty response text');
      }

      return response.text;
    } catch (error: any) {
      console.error('GeminiProvider generateJson Error:', error);
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('AI_QUOTA_EXCEEDED');
      }
      throw error;
    }
  }
}
