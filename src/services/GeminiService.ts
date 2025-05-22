import { createPartFromUri, GoogleGenAI } from '@google/genai';
import path from 'path';
import { Config } from '../config/config';
import { PROMPT } from '../constants/prompt';
import { ENV } from '../index';
import { TenderResponse } from './ClaudeService';
export class GeminiService {
  private readonly config: Config;
  private readonly ai: GoogleGenAI;

  constructor(config: Config) {
    this.config = config;

    // Validate API key format
    if (!ENV.GEMINI_API_KEY) {
      throw new Error('Invalid Gemini API key format. API key is required');
    }

    this.ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  }

  public async generateResponse(filePath: string): Promise<string> {
    try {
      const fileName = path.basename(filePath) || '';

      const file = await this.ai.files.upload({
        file: filePath,
        config: {
          displayName: fileName,
        },
      });

      // Wait for the file to be processed.
      let getFile = await this.ai.files.get({ name: file.name as string });
      while (getFile.state === 'PROCESSING') {
        getFile = await this.ai.files.get({ name: file.name as string });
        console.log(`current file status: ${getFile.state}`);
        console.log('File is still processing, retrying in 5 seconds');

        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      }
      if (file.state === 'FAILED') {
        throw new Error('File processing failed.');
      }

      // Add the file to the contents.
      const content: any = [PROMPT.gemini]; // TODO: fix type

      if (file.uri && file.mimeType) {
        const fileContent = createPartFromUri(file.uri, file.mimeType);
        content.push(fileContent);
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: content,
      });

      // console.log(response.text);

      return response.text || 'NOTHING RESPONSE';
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  public async generateResponseFromText(text: string): Promise<TenderResponse | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro-preview-05-06', // Ы
        contents: [PROMPT.geminiAnalysis + '\n\n' + text],
      });
      if (!response.text) return null;
      const parsedResponse = parseResponse(response.text || '');
      return parsedResponse;
    } catch (error) {
      console.error('Error generating response from text:', error);
      return null;
    }
  }
}

function parseResponse(text: string): TenderResponse {
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
    throw error;
  }
}
