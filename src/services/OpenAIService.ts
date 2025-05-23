import axios from 'axios';
import { Config } from '../config/config';
import { ENV } from '../index';

export class OpenAIService {
  private readonly config: Config;
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(config: Config) {
    this.config = config;
    
    // Validate API key format
    if (!ENV.OPENAI_API_KEY || !ENV.OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. API key should start with "sk-"');
    }

    this.apiKey = ENV.OPENAI_API_KEY;
  }

  public async generateResponse(prompt: string) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      console.log('OpenAI response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      } else if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  }
} 