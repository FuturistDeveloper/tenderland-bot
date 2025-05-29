import dotenv from 'dotenv';
import express from 'express';
import { getConfig } from './config/config';
import { connectDB } from './config/database';
import { BotService } from './services/BotService';
import { TenderAnalyticsService } from './services/TenderAnalyticsService';
import { TenderlandService } from './services/TenderlandService';
import { validateEnv } from './utils/env';
import { Context } from 'telegraf';

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
  regNumber: string, // 32514850391
  ctx: Context,
): Promise<string> => {
  try {
    // 0 STEP: Найти тендер в базе данных
    const tender = await tenderlandService.getTender(regNumber);

    if (!tender) {
      console.error('[getAnalyticsForTenders] Тендер с таким номером не найден');
      return 'Тендер с таким номером не найден';
    }

    if (tender.isProcessed && tender.finalReport) {
      console.log('[getAnalyticsForTenders] Тендер уже был обработан');
      const halfLength = Math.ceil(tender.finalReport.length / 2);
      await ctx.reply(tender.finalReport.slice(0, halfLength));
      await ctx.reply(tender.finalReport.slice(halfLength));
      return 'Тендер уже был обработан';
    }

    ctx.reply('Тендер успешно найден! Начинаем анализ...');

    // 1 STEP: Скачать и распаковать файлы
    const unpackedFiles = await tenderlandService.downloadZipFileAndUnpack(
      tender.regNumber,
      tender.files,
    );

    if (!unpackedFiles) {
      console.error('[getAnalyticsForTenders] Не удалось скачать или распаковать файлы');
      return 'Не удалось скачать или распаковать файлы';
    }

    // // 2 STEP: Анализ тендера с помощью Gemini Pro
    const claudeResponse = await tenderAnalyticsService.analyzeTender(
      tender.regNumber,
      unpackedFiles.files,
    );

    // // 3 STEP: Удалить распакованные файлы
    await tenderlandService.cleanupExtractedFiles(unpackedFiles.parentFolder);

    if (!claudeResponse) {
      console.error('[getAnalyticsForTenders] Не удалось получить ответ Gemini');
      return 'Не удалось получить ответ от ИИ';
    }

    // 4 STEP: Анализ товаров
    const isAnalyzed = await tenderAnalyticsService.analyzeItems(tender.regNumber, claudeResponse);

    if (isAnalyzed) {
      // 5 STEP: Генерация отчета
      const finalReport = await tenderAnalyticsService.generateFinalReport(tender.regNumber);

      if (finalReport) {
        const halfLength = Math.ceil(finalReport.length / 2);
        await ctx.reply(finalReport.slice(0, halfLength));
        await ctx.reply(finalReport.slice(halfLength));
      } else {
        await ctx.reply('Не удалось получить ответ от ИИ');
      }

      return 'Анализ тендера завершен';
    } else {
      return 'Не удалось проанализировать товары';
    }
  } catch (err) {
    console.error('Error in analytics job:', err);
    return `Произошла ошибка при анализе тендера: ${regNumber}`;
  }
};

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT} in ${config.environment} environment`);
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Bot is running',
    environment: config.environment,
  });
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
