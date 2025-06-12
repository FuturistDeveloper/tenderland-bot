import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  content?: string;
}

export class GoogleSearchService {
  private readonly apiKey: string;
  private readonly searchEngineId: string;
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  public async fetchWebpageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 5000, // 5 second timeout
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Parse HTML and extract text content
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Remove script and style elements
      const scripts = document.getElementsByTagName('script');
      const styles = document.getElementsByTagName('style');
      Array.from(scripts).forEach((script: Element) => script.remove());
      Array.from(styles).forEach((style: Element) => style.remove());

      // Get text content and clean it up
      let text = document.body.textContent || '';

      // Clean up the text
      text = text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim(); // Remove leading/trailing whitespace

      return text;
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error);
      return '';
    }
  }

  public async downloadHtml(
    url: string,
    outputPath: string,
  ): Promise<{ fullOutputPath: string } | null> {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Check if response data is empty
      if (!response.data) {
        console.error('Empty response from ' + url);
        return null;
      }

      // Handle HTML content
      const dom = new JSDOM(response.data.toString());
      const document = dom.window.document;

      // Remove script and style elements
      const scripts = document.getElementsByTagName('script');
      const styles = document.getElementsByTagName('style');
      Array.from(scripts).forEach((script: Element) => script.remove());
      Array.from(styles).forEach((style: Element) => style.remove());

      const htmlContent = document.body.innerHTML;

      // Create html directory if it doesn't exist
      const htmlDir = path.join(process.cwd(), 'html');
      if (!fs.existsSync(htmlDir)) {
        fs.mkdirSync(htmlDir, { recursive: true });
      }

      // Ensure the output path is in the html directory
      const fullOutputPath = path.join(htmlDir, path.basename(outputPath));

      // Write the cleaned HTML
      fs.writeFileSync(fullOutputPath, htmlContent);
      return { fullOutputPath };
    } catch (error) {
      console.error('Failed to download HTML from ' + url);
      return null;
    }
  }

  async search(query: string, numResults: number = 10): Promise<GoogleSearchResult[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: numResults,
        },
      });

      const items = response.data.items || [];
      const filteredItems = items.filter((item: { link: string }) => {
        return item.link.includes('.ru') || item.link.includes('.рф');
      });

      const results = filteredItems.map(
        (item: { title: string; link: string; snippet: string }) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }),
      );

      console.log(
        'Google search results:',
        results.length,
        results.map((item: { link: string }) => item.link),
      );

      return results;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Error performing Google search:', error.message);
      } else if (error instanceof Error) {
        console.error('Error performing Google search:', error.message);
      } else {
        console.error('Error performing Google search:', error);
      }
      return [];
    }
  }
}
