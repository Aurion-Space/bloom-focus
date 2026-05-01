import express from 'express';
import cors from 'cors';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

import { getAllowedOrigins, getDatabasePath, getPort, getTrustProxy } from './config.js';
import { runMigrations } from './db.js';
import { createRateLimitMiddleware, apiRateLimiter } from './lib/rate-limit.js';
import gardensRouter from './routes/gardens.js';
import sessionsRouter from './routes/sessions.js';
import publicRouter from './routes/public.js';

const dbPath = getDatabasePath();
mkdirSync(dirname(dbPath), { recursive: true });

runMigrations();

const app = express();
const PORT = getPort();
const allowedOrigins = new Set(getAllowedOrigins());

app.disable('x-powered-by');
app.set('trust proxy', getTrustProxy());

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', createRateLimitMiddleware({
  limiter: apiRateLimiter,
}));

app.use(express.json({ limit: '10kb' }));

app.use('/api/gardens', gardensRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api', publicRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(PORT, () => {
  console.log(`BloomFocus API running on http://localhost:${PORT}`);
});
