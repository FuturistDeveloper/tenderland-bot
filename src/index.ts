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
const config = getConfig();

const app = express();
app.use(express.json());

const claudeService = new ClaudeService(config);
const tenderlandService = new TenderlandService(config);
const botService = new BotService();

connectDB();

botService.start();

cron.schedule(config.cronSchedule, async () => {
  try {
    console.log(`Running TenderlandService cron job at ${new Date().toISOString()} in ${config.environment} environment`);
    const task = await tenderlandService.createTaskForGettingTenders();

    console.log(task);

    if (!task) {
      console.error('Error getting task');
      return;
    }

    const tenders = await tenderlandService.getTendersByTaskId(task.Id);
    // const tenders = await tenderlandService.getTendersByTaskId(1239286777);

    if (!tenders) {
      console.error('Error getting tenders');
      return;
    }

    tenders.items.forEach(async (tender) => {
      const tenderData = tender.tender;
      try {
        await Tender.findOneAndUpdate(
          { regNumber: tenderData.regNumber },
          {
            $setOnInsert: {
              regNumber: tenderData.regNumber,
              name: tenderData.name,
              beginPrice: tenderData.beginPrice,
              publishDate: tenderData.publishDate,
              endDate: tenderData.endDate,
                  region: tenderData.region,
                  typeName: tenderData.typeName,
                  lotCategories: tenderData.lotCategories,
                  files: tenderData.files,
                  module: tenderData.module,
                  etpLink: tenderData.etpLink,
              customers: tenderData.customers,
            }
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            includeResultMetadata: true,
          },
        );
      } catch (error) {
        console.error('Error processing tender:', tender.ordinalNumber, error);
      }
    });
  } catch (err) {
    console.error('Error in TenderlandService cron job:', err);
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bot is running',
    environment: config.environment
  });
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT} in ${config.environment} environment`);
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
