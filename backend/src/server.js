import app from './app.js';
import { CONFIG } from './config/config.js';
import { seedDatabase } from './database/seed.js';

async function startServer() {
  await seedDatabase();

  app.listen(CONFIG.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Urban Nest Node.js Backend listening on port ${CONFIG.PORT}`);
    console.log(`🌐 API Base URL: http://localhost:${CONFIG.PORT}${CONFIG.API_PREFIX}`);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
