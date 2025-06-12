import axios from 'axios';
import { JSDOM } from 'jsdom';

interface YandexSearchResponse {
  done: boolean;
  id: string;
  description: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
}

interface SearchResult {
  link: string;
  title: string;
  snippet: string;
}

class YandexSearchService {
  private readonly apiId: string;
  private readonly apiKey: string;
  private readonly folderId: string;

  constructor() {
    this.apiId = process.env.YANDEX_API_ID || '';
    this.apiKey = process.env.YANDEX_API_KEY || '';
    this.folderId = 'b1gehl0h15ne256j68ns';

    if (!this.apiKey) {
      throw new Error('YANDEX_API_KEY is not configured');
    }

    if (!this.apiId) {
      throw new Error('YANDEX_API_ID is not configured');
    }
  }

  private extractLinks(html: string): SearchResult[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results: SearchResult[] = [];

    // Find all organic search results
    const organicResults = document.querySelectorAll('.organic__url');

    organicResults.forEach((element) => {
      const link = element as HTMLAnchorElement;
      const titleElement = element.querySelector('.organic__title');

      if (link.href && titleElement) {
        results.push({
          link: link.href,
          title: titleElement.textContent?.trim() || '',
          snippet: '',
        });
      }
    });

    return results.filter(
      (result) =>
        !result.link.includes('yandex.ru') &&
        (result.link.includes('.ru') || result.link.includes('.рф')),
    );
  }

  public async search(query: string): Promise<SearchResult[]> {
    try {
      const operation = await axios.post<YandexSearchResponse>(
        'https://searchapi.api.cloud.yandex.net/v2/web/searchAsync',
        JSON.stringify({
          query: {
            searchType: 'SEARCH_TYPE_RU',
            queryText: query,
          },
          groupSpec: {
            groupsOnPage: '20',
          },
          folderId: this.folderId,
          responseFormat: 'FORMAT_HTML',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 YaBrowser/25.2.0.0 Safari/537.36',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Api-Key ${this.apiKey}`,
          },
          // proxy: {
          //   host: '46.8.23.68',
          //   port: 1050,
          //   auth: {
          //     username: 'UYXmCQ',
          //     password: 'GwX9zq37KR',
          //   },
          //   // protocol: 'http',
          // },
          // httpsAgent: new https.Agent({
          //   rejectUnauthorized: false,
          //   secureProtocol: 'TLSv1_2_method',
          // }),
          // timeout: 30000,
        },
      );

      console.log('operation.data id', operation.data.id);

      // Wait for the operation to complete]
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const res = await axios.get(
        `https://operation.api.cloud.yandex.net/operations/${operation.data.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Api-Key ${this.apiKey}`,
          },
          // proxy: {
          //   host: '46.8.23.68',
          //   port: 1050,
          //   auth: {
          //     username: 'UYXmCQ',
          //     password: 'GwX9zq37KR',
          //   },
          // },
          // httpsAgent: new https.Agent({
          //   rejectUnauthorized: false,
          //   secureProtocol: 'TLSv1_2_method',
          // }),
          // timeout: 30000,
        },
      );

      const htmlContent = Buffer.from(res.data.response.rawData, 'base64').toString();
      const results = this.extractLinks(htmlContent);
      console.log('results', results.length);
      return results.slice(10);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }
}

export default YandexSearchService;
