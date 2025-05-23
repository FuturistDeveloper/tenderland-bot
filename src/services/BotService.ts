import { Telegraf } from 'telegraf';
import { ENV } from '../index';
import { User } from '../models/User';

export class BotService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(ENV.BOT_TOKEN);
    this.setupMiddleware();
    this.setupCommands();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.bot.use(async (ctx, next) => {
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
  }

  private setupCommands(): void {
    this.bot.command('start', (ctx) => {
      ctx.reply('Welcome to the bot! 👋');
    });

    this.bot.command('help', (ctx) => {
      ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this help message');
    });
  }

  private setupErrorHandling(): void {
    this.bot.catch((err, ctx) => {
      console.error(`Error for ${ctx.updateType}:`, err);
      ctx.reply('An error occurred while processing your request.');
    });
  }

  public async start(): Promise<void> {
    try {
      await this.bot.launch();
      console.log('Bot started successfully');
    } catch (err) {
      console.error('Failed to start bot:', err);
      process.exit(1);
    }
  }

  public async stop(signal: string): Promise<void> {
    await this.bot.stop(signal);
  }
} 