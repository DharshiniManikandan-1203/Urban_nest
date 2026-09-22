import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: process.env.DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'urbannest.db') : path.resolve(__dirname, '../../urbannest.db')),
  JWT_SECRET: process.env.JWT_SECRET || 'urbannest-super-secure-secret-key-2026-xyz-987',
  JWT_EXPIRES_IN: '24h',
  API_PREFIX: '/api/v1',
  FRONTEND_URL: process.env.FRONTEND_URL || '*'
};

