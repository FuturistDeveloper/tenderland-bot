import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { Config } from '../config/config';
import { PROMPT } from '../constants/prompt';
import { ENV } from '../index';
import { TenderResponse } from './ClaudeService';

export class GeminiService {
  private readonly config: Config;
  private readonly client: GoogleGenerativeAI;

  constructor(config: Config) {
    this.config = config;
    
    // Validate API key format
    if (!ENV.GEMINI_API_KEY) {
      throw new Error('Invalid Gemini API key format. API key is required');
    }

    this.client = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
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
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse Gemini response');
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
            // Remove all HTML tags
            content = content.replace(/<[^>]+>/g, ' ');
            // Remove special characters and symbols
            content = content.replace(/[^\p{L}\p{N}\s.,;:!?-]/gu, ' ');
            // Remove multiple spaces, newlines, and tabs
            content = content.replace(/\s+/g, ' ').trim();
            // Remove empty lines
            content = content.replace(/^\s*[\r\n]/gm, '');
          } else {
            // For non-HTML files, clean the content
            // Remove special characters and symbols
            content = content.replace(/[^\p{L}\p{N}\s.,;:!?-]/gu, ' ');
            // Remove multiple spaces, newlines, and tabs
            content = content.replace(/\s+/g, ' ').trim();
            // Remove empty lines
            content = content.replace(/^\s*[\r\n]/gm, '');
          }

          // Truncate content if it's too large
          if (content.length > MAX_CONTENT_SIZE) {
            console.warn(`Content size (${content.length} chars) exceeds maximum (${MAX_CONTENT_SIZE} chars). Truncating...`);
            content = content.substring(0, MAX_CONTENT_SIZE);
          }

          return content;
        } else {
          try {
            const fileContent = fs.readFileSync(filePath);
            let content = fileContent.toString('utf-8');

            // Truncate content if it's too large
            if (content.length > MAX_CONTENT_SIZE) {
              console.warn(`Content size (${content.length} chars) exceeds maximum (${MAX_CONTENT_SIZE} chars). Truncating...`);
              content = content.substring(0, MAX_CONTENT_SIZE);
            }

            return content;
          } catch (error) {
            console.warn(`Failed to read ${filePath} as text, skipping file`);
            return null;
          }
        }
      }));

      // Filter out null values from failed file reads
      const validContents = fileContents.filter((content): content is string => content !== null);

      console.log('Processing files:', filePaths);
      console.log('File contents prepared:', validContents.length, 'files');

      // Initialize the model
      const model = this.client.getGenerativeModel({ model: "gemini-pro" });

      // Prepare the prompt with file contents
      const prompt = `${PROMPT.claude}\n\nDocuments to analyze:\n${validContents.join('\n\n')}`;

      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini API response received');
      console.log(text);

      // Parse the response text into structured data
      const parsedResponse = this.parseResponse(text);
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