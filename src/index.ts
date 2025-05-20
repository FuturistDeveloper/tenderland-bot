import dotenv from 'dotenv';
import express from 'express';
import { Telegraf } from 'telegraf';
import { z } from 'zod';
import { connectDB } from './config/database';
import { User } from './models/User';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform(Number),
  BOT_TOKEN: z.string(),
  MONGO_URI: z.string(),
  TENDERLAND_API_KEY: z.string(),
});

export const ENV = envSchema.parse(process.env);

const app = express();
app.use(express.json());

const bot = new Telegraf(ENV.BOT_TOKEN);

connectDB();

bot.use(async (ctx, next) => {
  if (ctx.from) {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        telegramId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      },
      { upsert: true, new: true },
    );
  }
  return next();
});

bot.command('start', (ctx) => {
  ctx.reply('Welcome to the bot! 👋');
});

bot.command('help', (ctx) => {
  ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this help message');
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred while processing your request.');
});

bot
  .launch()
  .then(() => {
    console.log('Bot started successfully');
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Bot is running' });
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
