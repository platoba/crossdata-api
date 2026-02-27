import { FastifyInstance } from 'fastify';
import { apiKeyAuth, AuthenticatedRequest } from '../auth/apiKey';
import { lookupProduct, getPriceHistory } from '../services/product';

export async function productRoutes(app: FastifyInstance) {
  app.post('/api/product/lookup', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const body = request.body as { asin?: string; url?: string; platform?: string };

    if (!body.asin && !body.url) {
      return reply.status(400).send({ error: 'Provide either asin or url' });
    }

    try {
      const result = await lookupProduct(body);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.post('/api/product/price-history', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const body = request.body as { asin: string; platform?: string; days?: number };

    if (!body.asin) {
      return reply.status(400).send({ error: 'asin is required' });
    }

    try {
      const result = await getPriceHistory(body.asin, body.platform, body.days);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
