import { z } from 'zod';

export const configSchema = z.object({
  environment: z.enum(['development', 'production', 'local']),
  cronSchedule: z.string(),
  tenderland: z.object({
    autosearchId: z.number(),
    batchSize: z.number(),
    limit: z.number(),
    orderBy: z.enum(['asc', 'desc']).default('desc'),
  }),
  claude: z.object({
    model: z.string(),
    maxTokens: z.number(),
  }),
  gemini: z.object({
    model: z.string(),
    maxTokens: z.number(),
  }),
});

export type Config = z.infer<typeof configSchema>;

const developmentConfig: Config = {
  environment: 'development',
  cronSchedule: '*/15 8-20 * * *',
  tenderland: {
    autosearchId: 249612, // Replace with your development autosearch ID
    batchSize: 10000,
    limit: 10000,
    orderBy: 'desc',
  },
  claude: {
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 20000,
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 20000,
  },
};

const productionConfig: Config = {
  environment: 'production',
  cronSchedule: '*/15 8-20 * * *',
  tenderland: {
    autosearchId: 249612, // Replace with your production autosearch ID
    batchSize: 10000,
    limit: 10000,
    orderBy: 'desc',
  },
  claude: {
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 20000,
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 20000,
  },
};

const localConfig: Config = {
  environment: 'local',
  cronSchedule: '*/1 * * * *', // Run every minute in test
  tenderland: {
    autosearchId: 249612, // Replace with your test autosearch ID
    batchSize: 10000,
    limit: 10000,
    orderBy: 'asc',
  },
  claude: {
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 20000,
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 20000,
  },
};

export function getConfig(): Config {
  const env = process.env.NODE_ENV || 'development';

  const config = (() => {
    switch (env) {
      case 'production':
        return productionConfig;
      case 'local':
        return localConfig;
      default:
        return developmentConfig;
    }
  })();

  // logConfig(config);
  return config;
}
