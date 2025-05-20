import Anthropic from '@anthropic-ai/sdk';
import { ENV } from '../index';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: ENV.TENDERLAND_API_KEY,
    });
  }

  public async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      console.error('Error generating Claude response:', error);
      throw error;
    }
  }
} 