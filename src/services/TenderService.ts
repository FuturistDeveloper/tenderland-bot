import * as fs from 'fs';
import { Tender } from '../models/Tender';
import { GeminiService, TenderResponse } from './GeminiService';
import { GoogleSearchService } from './GoogleService';
import { formatTenderData, getProductAnalysisPrompt, PROMPT } from '../constants/prompt';
import path from 'path';

export class TenderAnalyticsService {
  private geminiService: GeminiService;
  googleSearch = new GoogleSearchService();

  constructor() {
    this.geminiService = new GeminiService();
  }

  public async analyzeTender(
    regNumber: string,
    pathFiles: string[],
  ): Promise<TenderResponse | null> {
    try {
      console.log(`Processing tender: ${regNumber} with files: ${pathFiles}`);

      const responseFromFiles = await this.geminiService.generateResponseFromTenderFiles(pathFiles);

      if (!responseFromFiles) {
        console.error('No response found for file:', pathFiles);
        return null;
      }

      console.log(`Finished processing tender: ${regNumber} with files: ${pathFiles}`);

      await Tender.findOneAndUpdate(
        { regNumber },
        {
          $set: {
            responseFromFiles,
          },
        },
        { new: true },
      );

      console.log('Processing tender:', regNumber);

      return responseFromFiles;
    } catch (err) {
      console.error('Error in [analyzeTender]:', err);
      return null;
    }
  }

  public async analyzeItems(regNumber: string, tender: TenderResponse) {
    const itemPromises = tender.items.slice(0, 1).map(async (item, i: number) => {
      const { name, specifications } = item;
      const specificationsText = Object.entries(specifications);
      const specificationsTextString = specificationsText
        .map(([key, value]) => `\n${key}: ${value}`)
        .join(', ');
      const itemText = `
      Наименование товара: ${name}
      Технические характеристики товара: ${specificationsTextString}
      `;

      console.log('Analyzing item:', name);
      // const itemResponse = await this.geminiService.generateFindRequest(itemText);

      // if (!itemResponse) {
      //   console.error('No item response found for:', name);
      //   return;
      // }

      console.log('Item Responded', name);

      // const findRequest = itemResponse?.split('\n');
      const findRequest = [
        'выжигатель по дереву дуговой регулировка температуры',
        'прибор для выжигания дуговой для ткани 25 Вт',
        'купить выжигатель дуговой для дерева и ткани',
      ];

      await Tender.findOneAndUpdate(
        { regNumber },
        {
          $push: {
            findRequests: {
              itemName: name,
              findRequest,
            },
          },
        },
      );

      const searchPromises = findRequest.map(async (request) => {
        console.log('Starting search for:', request);
        const results = await this.googleSearch.search(request);
        const websitePromises = results
          .filter((result) => !result.link.endsWith('.pdf'))
          .map(async (result) => {
            const { link } = result;
            try {
              const randomUID = crypto.randomUUID();
              const outputPath = `${randomUID}.html`;

              console.log('Downloading HTML for:', link);
              const res = await this.googleSearch.downloadHtml(link, outputPath);

              if (!res) {
                // console.error('HTML was not downloaded for:', link);
                return {
                  link,
                  title: result.title,
                  snippet: result.snippet,
                  content: '',
                  html: '',
                };
              }

              // console.log('HTML downloaded for:', link);

              const response = await this.geminiService.generateResponse(
                res.fullOutputPath,
                PROMPT.geminiAnalyzeHTML,
                link,
              );

              // console.log('Getting response from url:', link);

              if (!response) {
                console.error('Failed to generate response to analyze the content from HTML');
                return {
                  link,
                  title: result.title,
                  snippet: result.snippet,
                  content: '',
                  html: res.bodyContent,
                };
              }
              console.log('Analyzing HTML finished for:', link);

              return {
                link,
                title: result.title,
                snippet: result.snippet,
                content: response,
                html: res.bodyContent,
              };
            } catch (error) {
              console.error('Error in [analyzeItems]:', error);
              return {
                link,
                title: result.title,
                snippet: result.snippet,
                content: '',
                html: '',
              };
            }
          });

        const responses = await Promise.all(websitePromises);
        // console.log('Responses:', responses);
        await Tender.findOneAndUpdate(
          { regNumber },
          {
            $push: {
              [`findRequests.${i}.parsedRequest`]: {
                requestName: request,
                responseFromWebsites: responses,
              },
            },
          },
        );

        return responses;
      });

      // Wait for all requests to complete
      const searchResults = await Promise.all(searchPromises);

      // console.log('Search results:', searchResults);

      const promptToAnalyze = getProductAnalysisPrompt(
        searchResults.flat().filter((site) => site.content !== ''),
        item,
      );

      // Save prompt to analyze to text file
      const promptDir = path.join(process.cwd(), 'prompts');
      if (!fs.existsSync(promptDir)) {
        fs.mkdirSync(promptDir);
      }
      fs.writeFileSync(
        path.join(promptDir, `prompt_${regNumber}_${item.name}.txt`),
        PROMPT.geminiAnalyzeHTML + '\n' + promptToAnalyze,
        'utf8',
      );

      console.log('Analyzing product:', name);

      const productAnalysis = await this.geminiService.analyzeProduct(promptToAnalyze);
      await Tender.findOneAndUpdate(
        { regNumber },
        { $set: { [`findRequests.${i}.productAnalysis`]: productAnalysis } },
      );
    });

    const results = await Promise.all(itemPromises);

    const htmlDir = path.join(process.cwd(), 'html');
    fs.rmSync(htmlDir, { recursive: true, force: true });
    console.log('Successfully deleted HTML directory');

    return results;
  }

  public async generateFinalReport(regNumber: string): Promise<string | null> {
    try {
      const tender = await Tender.findOne({ regNumber });

      if (!tender) {
        console.error('[generateFinalReport] Тендер не найден');
        return null;
      }

      const text = formatTenderData(tender);

      console.log('Генерация финального отчета для тендера:', regNumber);
      const answer = await this.geminiService.generateFinalRequest(text);

      if (!answer) {
        console.error('[generateFinalReport] Не удалось получить ответ от ИИ');
        return null;
      }

      await Tender.findOneAndUpdate({ regNumber }, { isProcessed: true, finalReport: answer });

      return answer;
    } catch (err) {
      console.error('[generateFinalReport] Ошибка при генерации отчета:', err);
      return null;
    }
  }
}
