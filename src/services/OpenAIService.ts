import OpenAI from 'openai';
import { ENV } from '../index';
import { PROMPT } from '../constants/prompt';
import * as fs from 'fs';
import { TenderResponse } from '../types/tender';
import pdf from 'pdf-parse';
import { JSDOM } from 'jsdom';
import parseResponse from '../utils/parsing';

export class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',
      // TODO: For hosting
      // httpAgent: {
      //   proxy: {
      //     host: 'proxy.toolip.io',
      //     port: 31113,
      //     auth: {
      //       username:
      //         '8c5906b99fbd1c0bcd0f916d545c565ab1708e0be0f1496baf997f51b30a755f33f856d7d162eb0468f21a595aed6361a78de16df55e62667af44347edfe74b2b091ead69511bdde611e51d3ec97887f',
      //       password: 'imsp9d74sdxw',
      //     },
      //   },
      // },
    });
  }

  public async readPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      console.log('readPDF', !!data.text);
      return data.text || '';
    } catch (error) {
      console.error('[readPDF] Ошибка при чтении PDF файла:', error);
      return '';
    }
  }

  public async readHTML(filePath: string): Promise<string> {
    try {
      const html = fs.readFileSync(filePath, 'utf-8');
      const dom = new JSDOM(html);
      console.log('readHTML', dom.window.document.body.textContent);
      return dom.window.document.body.textContent || '';
    } catch (error) {
      console.error('[readHTML] Ошибка при чтении HTML файла:', error);
      return '';
    }
  }

  public async generateResponseWithFile(
    path: string,
    prompt: string = PROMPT.gemini,
  ): Promise<string | null> {
    try {
      let text = '';
      if (path.endsWith('.pdf')) {
        text = await this.readPDF(path);
      } else if (path.endsWith('.html')) {
        text = await this.readHTML(path);
      } else {
        return null;
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });

      return response.choices[0].message.content || null;
    } catch (error) {
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

  public async generateResponseWithText(text: string): Promise<TenderResponse | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: PROMPT.geminiAnalysis,
          },
          { role: 'user', content: text },
        ],
      });

      if (!response.choices[0].message.content) return null;

      const parsedResponse = parseResponse(response.choices[0].message.content || '');
      return parsedResponse;
    } catch (error) {
      console.error('[generateResponseWithText] Ошибка при генерации запроса от OpenAI:', error);
      return null;
    }
  }

  public async generateFindRequest(text: string): Promise<string | null> {
    try {
      console.log('Generating find request');
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: PROMPT.geminiFindRequest,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });
      return response.choices[0].message.content || null;
    } catch (error) {
      console.error('[generateFindRequest] Ошибка при генерации запроса к OpenAI:', error);
      return null;
    }
  }

  public async generateFinalRequest(text: string): Promise<string | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: PROMPT.geminiFinalRequest,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });
      console.log('Final request:', response.choices[0].message.content);
      return response.choices[0].message.content || null;
    } catch (error) {
      console.error('Error generating final request:', error);
      return null;
    }
  }

  public async generateTest(text: string): Promise<string | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: text }],
      });
      return response.choices[0].message.content || null;
    } catch (error) {
      console.error('Error generating test:', error);
      return null;
    }
  }
}
