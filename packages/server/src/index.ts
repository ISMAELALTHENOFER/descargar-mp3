import 'dotenv/config';
import { createApp } from './app.js';
import { tempManager } from './infra/temp/temp-manager.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[server] running on http://localhost:${PORT}`);
    console.log(`[server] env: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch(console.error);
