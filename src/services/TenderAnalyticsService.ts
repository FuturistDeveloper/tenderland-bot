import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../config/config';
import { Tender } from '../models/Tender';
import { GeminiService } from './GeminiService';

interface AnalyzedFile {
  analyzedFile: string;
  response: string;
}

export class TenderAnalyticsService {
  private geminiService: GeminiService;
  private readonly outputDir = 'analysis_results';

  constructor(config: Config) {
    this.geminiService = new GeminiService(config);
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private async saveAnalysisToFile(
    tender: any,
    analyzedFiles: AnalyzedFile[],
    finalAnalysis: string,
  ) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.join(this.outputDir, `tender_${tender.regNumber}_${timestamp}.txt`);

    let content = `Tender Analysis Report\n`;
    content += `===================\n\n`;
    content += `Tender Registration Number: ${tender.regNumber}\n`;
    content += `Analysis Date: ${new Date().toISOString()}\n\n`;
    content += `Individual File Analysis\n`;
    content += `=====================\n\n`;

    for (const file of analyzedFiles) {
      content += `File: ${file.analyzedFile}\n`;
      content += `Analysis:\n${file.response}\n`;
      content += `-------------------\n\n`;
    }

    content += `Final Analysis\n`;
    content += `=============\n\n`;
    content += finalAnalysis;

    await fs.promises.writeFile(fileName, content, 'utf8');
    console.log(`Analysis saved to file: ${fileName}`);
    return fileName;
  }

  public async analyzeTender(regNumber: string, pathFiles: string[]) {
    try {
      const analyzedFiles: AnalyzedFile[] = [];

      for (const pathFile of pathFiles) {
        console.log('Processing file:', pathFile);
        const response = await this.geminiService.generateResponse(pathFile);
        analyzedFiles.push({
          analyzedFile: pathFile,
          response,
        });
        console.log('Finished processing file:', pathFile);
      }

      const combinedText = analyzedFiles
        .map((file) => {
          return `File: ${file.analyzedFile}\n\nAnalysis:\n${file.response}\n\n---\n\n`;
        })
        .join('');

      await Tender.findOneAndUpdate(
        { regNumber },
        {
          $set: {
            analyzedFiles,
          },
        },
        { new: true },
      );

      console.log('Processing tender:', regNumber);

      const finalAnalysis = await this.geminiService.generateResponseFromText(combinedText);

      if (!finalAnalysis) {
        console.error('No final analysis found for tender:', regNumber);
        return;
      }

      await Tender.findOneAndUpdate(
        { regNumber },
        {
          $set: {
            claudeResponse: finalAnalysis,
            isProcessed: true,
          },
        },
        { new: true },
        
      );
    } catch (err) {
      console.error('Error in TenderAnalyticsService:', err);
    }
  }
}
