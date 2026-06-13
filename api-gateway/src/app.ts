import express from 'express';
import { authMiddleware } from './middlewares/auth.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
import { proxyToPaymentService } from './middlewares/proxy.middleware';
import { rateLimitMiddleware } from './middlewares/rate-limit.middleware';

const app = express();

app.use(express.json());

app.use(loggingMiddleware);

app.use('/api/v1', authMiddleware);
app.use('/api/v1', rateLimitMiddleware);

app.all('/api/v1/transactions*', proxyToPaymentService);
app.all('/api/v1/settlements*', proxyToPaymentService);

app.get('/', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

export default app;
