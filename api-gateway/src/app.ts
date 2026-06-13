import express from 'express';
import { authMiddleware } from './middlewares/auth.middleware';
import { proxyToPaymentService } from './middlewares/proxy.middleware';

const app = express();

app.use(express.json());

app.use('/api/v1', authMiddleware);

app.all('/api/v1/transactions*', proxyToPaymentService);
app.all('/api/v1/settlements*', proxyToPaymentService);

app.get('/', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

export default app;
