import app from '../backend/src/app.js';
import { seedDatabase } from '../backend/src/database/seed.js';

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    try {
      await seedDatabase();
    } catch (err) {
      console.warn('Database initialization note:', err.message);
    }
    initialized = true;
  }
  return app(req, res);
}
