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

export const getAnalyticsForTenders = async (
  regNumber: string = '32514850391',
): Promise<string> => {
  try {
    // 0 STEP: Найти тендер в базе данных
    const tender = await Tender.findOne({ regNumber }).select(
      'regNumber tender.files claudeResponse',
    );

    if (!tender) {
      console.error('[getAnalyticsForTenders] Тендер с таким номером не найден');
      return 'Тендер с таким номером не найден';
    }

    // 1 STEP: Скачать и распаковать файлы
    const files = await tenderlandService.downloadZipFileAndUnpack(
      tender.regNumber,
      tender.tender.files,
    );

    if (!files) {
      console.error('[getAnalyticsForTenders] Не удалось скачать или распаковать файлы');
      return 'Не удалось скачать или распаковать файлы';
    }

    // TODO: Remove this after testing
    // const files = [
    //   '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/32514850391/converted/Извещение о закупке № 32514850391.html',
    //   '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/32514850391/converted/ЗК_МСП_бинокли и комплектующие_Ростовский ЦООТЭК.pdf',
    // ];

    // 2 STEP: Анализ тендера с помощью Gemini Pro
    const claudeResponse = await tenderAnalyticsService.analyzeTender(tender.regNumber, files);

    // 3 STEP: Удалить распакованные файлы
    await tenderlandService.cleanupExtractedFiles(files);

    if (!claudeResponse) {
      console.error('[getAnalyticsForTenders] Не удалось получить ответ Gemini');
      return 'Не удалось получить ответ от ИИ';
    }

    await tenderAnalyticsService.analyzeItems(tender.regNumber, claudeResponse);

    return 'Анализ тендера завершен успешно';
  } catch (err) {
    console.error('Error in analytics job:', err);
    return `Произошла ошибка при анализе тендера: ${regNumber}`;
  }
};

cron.schedule(config.cronSchedule, async () => {});

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
