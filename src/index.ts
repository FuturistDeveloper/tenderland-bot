import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import { getConfig } from './config/config';
import { connectDB } from './config/database';
import { Tender } from './models/Tender';
import { BotService } from './services/BotService';
import { ClaudeService } from './services/ClaudeService';
import { TenderlandService } from './services/TenderlandService';
import { validateEnv } from './utils/env';

dotenv.config();

export const ENV = validateEnv();
export const config = getConfig();

const app = express();
app.use(express.json());

const claudeService = new ClaudeService(config);
const tenderlandService = new TenderlandService(config);
const botService = new BotService();

connectDB();

botService.start();

const getAnalyticsForTenders = async () => {
  try {
    const tenders = await Tender.find();

    if (!tenders) {
      console.error('Tender not found');
      return;
    }

    for (const tender of tenders) {
      await tenderlandService.downloadZipFileAndUnpack(tender.regNumber, tender.tender.files);
    }

  } catch (err) {
    console.error('Error in TenderlandService cron job:', err);
  }
};

getAnalyticsForTenders();

cron.schedule(config.cronSchedule, async () => {
  console.log('Cron job started');
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
