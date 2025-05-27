/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import { getConfig } from './config/config';
import { connectDB } from './config/database';
import { Tender } from './models/Tender';
import { BotService } from './services/BotService';
import { TenderAnalyticsService } from './services/TenderAnalyticsService';
import { TenderlandService } from './services/TenderlandService';
import { validateEnv } from './utils/env';

dotenv.config();

export const ENV = validateEnv();
export const config = getConfig();

const app = express();
app.use(express.json());

const tenderlandService = new TenderlandService(config);
const tenderAnalyticsService = new TenderAnalyticsService(config);
const botService = new BotService();

connectDB();

botService.start();

const getAnalyticsForTenders = async () => {
  try {
    // TODO: Remove this after testing
    await Tender.findOne({ regNumber: '32514850391' })
      .select('regNumber tender.files claudeResponse')
      .cursor()
      .eachAsync(async (tender) => {
        if (!tender) {
          console.error('[getAnalyticsForTenders] Tender with such regNumber not found');
          return;
        }

        // 1 STEP: Download and unpack files
        const files = await tenderlandService.downloadZipFileAndUnpack(
          tender.regNumber,
          tender.tender.files,
        );

        // const files = [
        //   '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/32514850391/converted/Извещение о закупке № 32514850391.html',
        //   '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/32514850391/converted/ЗК_МСП_бинокли и комплектующие_Ростовский ЦООТЭК.pdf',
        // ];

        // 2 STEP: Analyze tender with Gemini Pro
        const claudeResponse = await tenderAnalyticsService.analyzeTender(tender.regNumber, files);

        // 3 STEP: Remove unpacked files
        // await tenderlandService.cleanupExtractedFiles(files);

        if (!claudeResponse) {
          console.error('[getAnalyticsForTenders] Claude Response is null');
          return;
        }

        // 4 STEP: Analyze each Item with Gemini Pro and generate prompts
        // TODO: Change to claudeResponse from line 52 instead of tender.claudeResponse
        // if (tender.claudeResponse) {
        await tenderAnalyticsService.analyzeItems(tender.regNumber, claudeResponse);
        // }
      });
  } catch (err) {
    console.error('Error in analytics job:', err);
  }
};

// getAnalyticsForTenders();

cron.schedule(config.cronSchedule, async () => {
  // await tenderlandService.getTenders();
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT} in ${config.environment} environment`);
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Bot is running',
    environment: config.environment,
  });
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/api', (req, res) => {
  res.send('API is running');
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
