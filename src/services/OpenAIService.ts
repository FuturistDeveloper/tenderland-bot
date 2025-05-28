import OpenAI from 'openai';
import { Config } from '../config/config';
import { ENV } from '../index';

export class OpenAIService {
  private readonly config: Config;
  private readonly client: OpenAI;

  constructor(config: Config) {
    this.config = config;

    this.client = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
  }

  public async generateResponse(prompt: string) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 10000,
      });

      console.log('OpenAI response:', response.choices[0].message.content);
      return response.choices[0].message.content || null;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      return '[OpenAIService] Произошла ошибка при выполнении операции';
    }
  }
}
