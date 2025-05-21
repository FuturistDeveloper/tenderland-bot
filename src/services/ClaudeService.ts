import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { Config } from '../config/config';
import { PROMPT } from '../constants/prompt';
import { ENV } from '../index';

export interface TenderResponse {
  tender: {
    name: string;
    number: string;
    type: string;
    price: string;
    currency: string;
    application_deadline: string;
    auction_date: string;
  };
  customer: {
    name: string;
    inn: string;
    ogrn: string;
    address: string;
    contacts: string;
  };
  delivery_terms: {
    delivery_period: {
      type: string;
      value: string;
    };
    delivery_location: string;
    payment_terms: {
      prepayment_percent: number;
      payment_days: number;
    };
    application_security: {
      amount: number | null;
      percent: number | null;
    };
    contract_security: {
      amount: number | null;
      percent: number | null;
    };
  };
  items: Array<{
    name: string;
    quantity: {
      value: string;
      unit: string;
    };
    specifications: Record<string, string>;
    requirements: string[];
    estimated_price: number | null;
  }>;
  special_conditions: {
    requirements_for_participants: string[];
    penalties: string[];
    other_conditions: string[];
  };
}

export class ClaudeService {
  private readonly config: Config;
  private readonly client: Anthropic;

  constructor(config: Config) {
    this.config = config;
    
    // Validate API key format
    if (!ENV.CLAUDE_API_KEY || !ENV.CLAUDE_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid Claude API key format. API key should start with "sk-"');
    }

    this.client = new Anthropic({
      apiKey: ENV.CLAUDE_API_KEY,
    });
  }

  private parseResponse(text: string): TenderResponse {
    try {
      // Extract JSON from the text block
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('No JSON data found in response');
      }
      
      const jsonStr = jsonMatch[1];
      return JSON.parse(jsonStr) as TenderResponse;
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      throw new Error('Failed to parse Claude response');
    }
  }

  public async generateResponse(filePaths: string[]): Promise<TenderResponse> {
    try {   
      const MAX_CONTENT_SIZE = 100000; // Maximum content size in characters

      const fileContents = await Promise.all(filePaths.map(async filePath => {
        const fileExt = path.extname(filePath).toLowerCase();
        
        if (fileExt === '.docx' || fileExt === '.html' || fileExt === '.htm') {
          let content: string;
          const fileContent = fs.readFileSync(filePath);
          content = fileContent.toString('utf-8');
          // For HTML files, try to extract only the main content
          if (fileExt === '.html' || fileExt === '.htm') {
            // Remove script tags and their content
            content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            // Remove style tags and their content
            content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            // Remove HTML comments
            content = content.replace(/<!--[\s\S]*?-->/g, '');
            // Remove extra whitespace
            content = content.replace(/\s+/g, ' ').trim();
          }

          // Truncate content if it's too large
          if (content.length > MAX_CONTENT_SIZE) {
            console.warn(`Content size (${content.length} chars) exceeds maximum (${MAX_CONTENT_SIZE} chars). Truncating...`);
            content = content.substring(0, MAX_CONTENT_SIZE);
          }

          return {
            type: 'text' as const,
            text: content
          };
        } else {
          const pdfBase64 = fs.readFileSync(filePath).toString('base64');

          return {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf' as const,
              data: pdfBase64
            },
            cache_control: { type: 'ephemeral' } as const,
          };
        }
      }));

      console.log('Processing files:', filePaths);
      console.log('File contents prepared:', fileContents.length, 'files');

      const response = await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 20000,
        temperature: 1,
        system: "You are a helpful assistant that analyzes tender documents.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: PROMPT.claude
              },
              ...fileContents
            ]
          }
        ]
      });
      
      console.log('Claude API response received');
      console.log(response.content[0]);

      // Parse the response text into structured data
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      const parsedResponse = this.parseResponse(content.text);
      return parsedResponse;
    } catch (error) {
      if (error instanceof Error) {
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