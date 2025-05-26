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
    // await tenderlandService.getTenders();

    await Tender.findOne({ regNumber: '32514850391' })
      .cursor()
      .eachAsync(async (tender) => {
        // const files = await tenderlandService.downloadZipFileAndUnpack(
        //   tender.regNumber,
        //   tender.tender.files,
        // );
        // await tenderAnalyticsService.analyzeTender(tender.regNumber, files);
        // await tenderlandService.cleanupExtractedFiles(files);
        // 3 STEP: Analyze each Item with Gemini Pro and generate prompts

        if (tender && tender.claudeResponse) {
          await tenderAnalyticsService.analyzeItems(tender.regNumber, tender.claudeResponse);
        }
      });

    // await tenderAnalyticsService.analyzeAllTenders(TENDERS);
  } catch (err) {
    console.error('Error in analytics job:', err);
  }
};

getAnalyticsForTenders();

cron.schedule(config.cronSchedule, async () => {
  // console.log('Cron job started');
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Bot is running',
    environment: config.environment,
  });
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT} in ${config.environment} environment`);
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
