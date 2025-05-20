import chalk from 'chalk';
import { Config } from '../config/config';

const logBox = (title: string, content: string) => {
  const width = 60;
  const padding = 2;
  const titlePadding = Math.floor((width - title.length) / 2);
  
  console.log('\n' + '═'.repeat(width));
  console.log('║' + ' '.repeat(titlePadding) + chalk.bold(title) + ' '.repeat(width - titlePadding - title.length - 2) + '║');
  console.log('║' + ' '.repeat(padding) + '─'.repeat(width - padding * 2) + ' '.repeat(padding) + '║');
  
  content.split('\n').forEach(line => {
    console.log('║' + ' '.repeat(padding) + line + ' '.repeat(width - line.length - padding * 2) + '║');
  });
  
  console.log('═'.repeat(width) + '\n');
};

export const logConfig = (config: Config) => {
  const environmentColor = {
    development: chalk.yellow,
    production: chalk.green,
    local: chalk.blue
  }[config.environment];

  const configContent = `
Environment: ${environmentColor(config.environment)}
Cron Schedule: ${chalk.cyan(config.cronSchedule)}

${chalk.bold('Tenderland Settings:')}
  • Autosearch ID: ${chalk.cyan(config.tenderland.autosearchId)}
  • Batch Size: ${chalk.cyan(config.tenderland.batchSize)}
  • Limit: ${chalk.cyan(config.tenderland.limit)}
  • Order By: ${chalk.cyan(config.tenderland.orderBy)}

${chalk.bold('Claude Settings:')}
  • Model: ${chalk.cyan(config.claude.model)}
  • Max Tokens: ${chalk.cyan(config.claude.maxTokens)}
`;

  logBox('Configuration', configContent);
}; 