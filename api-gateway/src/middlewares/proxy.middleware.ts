import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 5000;

const PROPAGATED_HEADERS = ['x-api-key', 'content-type', 'authorization'];

export async function proxyToPaymentService(
  req: Request,
  res: Response,
): Promise<void> {
  const targetPath = req.originalUrl.replace('/api/v1', '');
  const targetUrl = `${PAYMENT_SERVICE_URL}${targetPath}`;

  const headers: Record<string, string> = {};
  for (const header of PROPAGATED_HEADERS) {
    const value = req.headers[header];
    if (value) headers[header] = value as string;
  }

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: ['GET', 'HEAD'].includes(req.method.toUpperCase())
        ? undefined
        : req.body,
      timeout: TIMEOUT_MS,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNREFUSED') {
      res.status(503).json({
        statusCode: 503,
        message: 'Servicio de pagos no disponible',
        error: 'Service Unavailable',
      });
      return;
    }

    if (axiosError.code === 'ECONNABORTED') {
      res.status(504).json({
        statusCode: 504,
        message: 'El servicio de pagos no respondio a tiempo',
        error: 'Gateway Timeout',
      });
      return;
    }

    res.status(502).json({
      statusCode: 502,
      message: 'Error inesperado en el servicio de pagos',
      error: 'Bad Gateway',
    });
  }
}
