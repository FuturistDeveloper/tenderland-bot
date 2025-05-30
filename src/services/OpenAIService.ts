import OpenAI from 'openai';
import { ENV } from '../index';

export class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
  }

  public async generateResponse(prompt: string): Promise<string | null> {
    console.log('[OpenAI generateResponse] Начало операции');
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
      });
      console.log('OpenAI response:', response.choices[0].message.content);
      return response.choices[0].message.content || null;
    } catch (error) {
      console.log('[OpenAI generateResponse] Произошла ошибка при выполнении операции');
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      return null;
    }
  }

  public async generateFinalRequest(prompt: string): Promise<string | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'o3',
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
      console.log('[OpenAI generateFinalRequest] Произошла ошибка при выполнении операции');
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      return null;
    }
  }
}
