import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/database';
import { BotService } from './services/BotService';
import { ClaudeService } from './services/ClaudeService';
import { validateEnv } from './utils/env';

dotenv.config();

export const ENV = validateEnv();

const app = express();
app.use(express.json());

const claudeService = new ClaudeService();
const botService = new BotService();

connectDB();

botService.start();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Bot is running' });
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`);
});

process.once('SIGINT', () => botService.stop('SIGINT'));
process.once('SIGTERM', () => botService.stop('SIGTERM'));
