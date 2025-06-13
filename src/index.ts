import dotenv from 'dotenv';
import express from 'express';
import { getConfig } from './config/config';
import { connectDB } from './config/database';
import { BotService } from './services/BotService';
import { TenderlandService } from './services/TenderlandService';
import { validateEnv } from './utils/env';
import { TenderAnalyticsService } from './services/TenderService';
import axios from 'axios';
import { GeminiService } from './services/GeminiService';
import cron from 'node-cron';
import https from 'https';

dotenv.config();

export const ENV = validateEnv();
export const config = getConfig();

const app = express();
app.use(express.json());

const tenderlandService = new TenderlandService(config);
const tenderService = new TenderAnalyticsService();
const botService = new BotService();

connectDB();

botService.start();

console.log('Current time: ', new Date().toLocaleString());

export const getAnalyticsForTenders = async (regNumber: string, userId: number): Promise<void> => {
  try {
    // 0 STEP: Найти тендер в базе данных
    const tender = await tenderlandService.getTender(regNumber);

    if (!tender) {
      console.error('[getAnalyticsForTenders] Тендер с таким номером не найден');
      botService.sendMessage(userId, 'Тендер с таким номером не найден');
      return;
    }

    if (tender.isProcessed && tender.finalReport) {
      console.log('[getAnalyticsForTenders] Тендер уже был обработан');
      const maxLength = 4096;
      const chunks = [];
      let currentChunk = '';

      const words = tender.finalReport.split(' ');
      for (const word of words) {
        if ((currentChunk + word).length >= maxLength) {
          chunks.push(currentChunk);
          currentChunk = word + ' ';
        } else {
          currentChunk += word + ' ';
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      for (const chunk of chunks) {
        await botService.sendMessage(userId, chunk);
      }
      botService.sendMessage(userId, 'Тендер уже был обработан');
      return;
    }

    botService.sendMessage(userId, 'Тендер успешно найден! Начинаем анализ...');

    // 1 STEP: Скачать и распаковать файлы
    const unpackedFiles = await tenderlandService.downloadZipFileAndUnpack(
      tender.regNumber,
      tender.files,
    );

    // const unpackedFiles = {
    //   files: [
    //     '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/0187300010325000309/converted/Печатная форма извещения 39714788.html',
    //     '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/0187300010325000309/converted/�ਫ������ � 2 ���᭮����� ����.pdf',
    //     '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/0187300010325000309/converted/�ਫ������ � 3 �ॡ������ � ���.pdf',
    //     '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/0187300010325000309/converted/�ਫ������ � 1  ���ᠭ�� ��쥪� ���㯪� 2.pdf',
    //   ],
    //   parentFolder:
    //     '/Users/matsveidubaleka/Documents/GitHub/tenderland-bot/tenderland/0187300010325000309',
    // };

    if (!unpackedFiles) {
      console.error('[getAnalyticsForTenders] Не удалось скачать или распаковать файлы');
      botService.sendMessage(userId, 'Не удалось скачать или распаковать файлы');
      return;
    }

    console.log('unpackedFiles', unpackedFiles);

    // 2 STEP: Анализ тендера с помощью Gemini Pro
    const responseFromFiles = await tenderService.analyzeTender(
      tender.regNumber,
      unpackedFiles.files,
    );

    // const resTender = await Tender.findOne({ regNumber });
    // const responseFromFiles = resTender?.responseFromFiles;

    // // 3 STEP: Удалить распакованные файлы
    await tenderlandService.cleanupExtractedFiles(unpackedFiles.parentFolder);

    if (!responseFromFiles) {
      console.error('[getAnalyticsForTenders] Не удалось получить ответ Gemini');
      botService.sendMessage(userId, 'Не удалось получить ответ от ИИ');
      return;
    }

    // 4 STEP: Анализ товаров
    const isAnalyzed = await tenderService.analyzeItems(tender.regNumber, responseFromFiles);

    if (isAnalyzed) {
      // 5 STEP: Генерация отчета
      const finalReport = await tenderService.generateFinalReport(tender.regNumber);

      if (finalReport) {
        // const thirdLength = Math.ceil(tender.finalReport.length / 3);
        const maxLength = 4096; // Telegram message length limit
        const chunks = [];
        let currentChunk = '';

        const words = finalReport.split(' ');
        for (const word of words) {
          if ((currentChunk + word).length >= maxLength) {
            chunks.push(currentChunk);
            currentChunk = word + ' ';
          } else {
            currentChunk += word + ' ';
          }
        }
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        for (const chunk of chunks) {
          await botService.sendMessage(userId, chunk);
        }
        botService.sendMessage(userId, 'Анализ тендера завершен');
        return;
      } else {
        await botService.sendMessage(userId, 'Не удалось получить ответ от ИИ');
        return;
      }
    } else {
      botService.sendMessage(userId, 'Не удалось проанализировать товары');
      return;
    }
  } catch (err) {
    console.error('Error in analytics job:', err);
    botService.sendMessage(userId, `Произошла ошибка при анализе тендера: ${regNumber}`);
    return;
  }
};

cron.schedule(config.cronSchedule, async () => {
  // console.log('Getting new tenders');
  // await tenderlandService.getNewTenders();
});

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

app.get('/api/test/request', async (req, res) => {
  try {
    const response = await axios.get('https://telescope1.ru/catalog/binoculars/veber-sputnik', {
      proxy: {
        host: '46.161.45.148',
        port: 9128,
        auth: {
          username: 'of92n7',
          password: 'V1Bp8E',
        },
      },
      httpAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
    console.log(response.data);
    return res.send(response.data);
  } catch (error) {
    console.error('Error in test job:', error);
    return res.status(500).send('Произошла ошибка при тестировании');
  }
});

app.get('/api/test/gemini', async (req, res) => {
  try {
    const gemini = new GeminiService();
    const response = await gemini.testGemini();
    return res.send(response);
  } catch (error) {
    console.error('Error in test job:', error);
    return res.status(500).send('Произошла ошибка при тестировании');
  }
});

app.get('/api/test/zip', async (req, res) => {
  console.log('test zip');
  const response = await fetch(
    'https://tenderland.ru/Api/File/GetAll?entityId=TL2017285092&entityTypeId=1&apiKey=cebc71bc-ee83-4945-946c-97926f84790c',
    {
      method: 'GET',
    },
  );
  const data = await response.arrayBuffer();
  console.log(data);
  return res.send(data);
});

app.get('/api/test/dnsleak', async (req, res) => {
  const response = await axios.get('https://www.dnsleaktest.com/');
  return res.send(response.data);
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
