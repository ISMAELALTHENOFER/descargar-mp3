import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './api/middleware/error-handler.js';
import router from './api/routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const staticPath = join(__dirname, '../../web/dist');
  app.use(express.static(staticPath));

  app.use('/api/v1', router);

  app.get('*', (_req, res) => {
    res.sendFile(join(staticPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
