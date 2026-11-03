import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { requestContext } from './middleware/requestContext.js';

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',').map((origin) => origin.trim());
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Device-ID'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '12kb', strict: true }));
  app.use(requestContext);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
