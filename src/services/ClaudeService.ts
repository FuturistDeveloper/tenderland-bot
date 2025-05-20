import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../config/config';
import { ENV } from '../index';

export class ClaudeService {
  private client: Anthropic;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: ENV.CLAUDE_API_KEY,
    });
  }

  public async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.config.claude.model,
        max_tokens: this.config.claude.maxTokens,
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