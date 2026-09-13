import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { apiRateLimit, authRateLimit } from './middleware/rateLimit.js';
import { authRouter, accountRouter } from './routes/auth.js';
import { subscriptionRouter } from './routes/subscription.js';
import { horsesRouter } from './routes/horses.js';
import { videosRouter } from './routes/videos.js';
import { analysesRouter } from './routes/analyses.js';
import { morphologyRouter } from './routes/morphology.js';
import { chatRouter } from './routes/chat.js';
import { showsRouter } from './routes/shows.js';
import { progressRouter } from './routes/progress.js';
import { webhooksRouter } from './routes/webhooks.js';
import { aiProviderName } from './ai/index.js';

const app = express();

// Railway (y la mayoria de hostings) ponen la app detras de un proxy/balanceador
// que anade X-Forwarded-For. Sin esto, express-rate-limit rechaza la peticion
// entera por seguridad (no puede fiarse de la IP) en vez de limitar sin mas.
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRateLimit);

app.get('/health', (req, res) => res.json({ ok: true, aiProvider: aiProviderName }));

app.use('/api/auth', authRateLimit, authRouter);
app.use('/api', accountRouter);
app.use('/api', subscriptionRouter);
app.use('/api', horsesRouter);
app.use('/api', videosRouter);
app.use('/api', analysesRouter);
app.use('/api', morphologyRouter);
app.use('/api', chatRouter);
app.use('/api', showsRouter);
app.use('/api', progressRouter);
app.use('/api', webhooksRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'error_interno' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Equus Lab backend escuchando en :${PORT} (IA: ${aiProviderName})`);
});
