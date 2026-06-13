import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key);
    }
  }
}, WINDOW_MS);

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = (req.headers['x-api-key'] as string) ?? req.ip ?? 'anonymous';
  const now = Date.now();

  const entry = store.get(apiKey);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(apiKey, { count: 1, windowStart: now });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      statusCode: 429,
      message: `Has excedido el limite de ${MAX_REQUESTS} requests por minuto`,
      error: 'Too Many Requests',
    });
    return;
  }

  entry.count++;
  next();
}
