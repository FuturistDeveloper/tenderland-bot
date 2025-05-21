import dotenv from 'dotenv';
import express from 'express';
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

// cron.schedule(config.cronSchedule, async () => {
const func = async () => {
  // try {
  //   console.log(`Running TenderlandService cron job at ${new Date().toISOString()} in ${config.environment} environment`);
  //   const task = await tenderlandService.createTaskForGettingTenders();

  //   console.log(task);

  //   if (!task) {
  //     console.error('Error getting task');
  //     return;
  //   }

  //   const tenders = await tenderlandService.getTendersByTaskId(task.Id);

  //   if (!tenders) {
  //     console.error('Error getting tenders');
  //     return;
  //   }

  //   tenders.items.forEach(async (tender) => {
  //     const tenderData = tender.tender;
  //     try {
  //       await Tender.findOneAndUpdate(
  //         { regNumber: tenderData.regNumber },
  //         {
  //           $setOnInsert: {
  //             regNumber: tenderData.regNumber,
  //             tender: {
  //               ordinalNumber: tender.ordinalNumber,
  //               name: tenderData.name,
  //               beginPrice: tenderData.beginPrice,
  //               publishDate: tenderData.publishDate,
  //               endDate: tenderData.endDate,
  //               region: tenderData.region,
  //               typeName: tenderData.typeName,
  //               lotCategories: tenderData.lotCategories,
  //               files: tenderData.files,
  //               module: tenderData.module,
  //               etpLink: tenderData.etpLink,
  //               customers: tenderData.customers
  //             },
  //             isProcessed: false,
  //             analytics: null,
  //             reports: null
  //           }
  //         },
  //         {
  //           upsert: true,
  //           new: true,
  //           runValidators: true,
  //           includeResultMetadata: true,
  //         },
  //       );
  //     } catch (error) {
  //       console.error('Error processing tender:', tender.ordinalNumber, error);
  //     }
  //   });
  // } catch (err) {
  //   console.error('Error in TenderlandService cron job:', err);
  // }

  const tender = await Tender.findOne({
    regNumber: "0372200174325000009"
  })

  if(!tender) {
    console.error('Tender not found');
    return;
  }

  // const filePaths = await tenderlandService.downloadZipFileAndUnpack(tender.tender.files);
  // console.log(filePaths);

  const filePaths = [
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\Прил.3_Требования_к_заявке__(Преимущ.).doc',
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\Прил.3__ООЗ.docx',
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\Печатная форма извещения 39482579.html',
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\НМЦК_прил._2_(1).docx',
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\Прил.4_Проект_контракта.doc',
    'C:\\Users\\user\\Documents\\GitHub\\tenderland-bot\\tenderland\\Автоматический контроль.pdf'
  ]
  
  const response =  await claudeService.generateResponse(filePaths);

  console.log(response);

  tender.claudeResponse = response;
  await tender.save();

  await tenderlandService.cleanupExtractedFiles(filePaths);
};

func();

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
