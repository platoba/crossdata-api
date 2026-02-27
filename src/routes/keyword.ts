import { FastifyInstance } from 'fastify';
import { apiKeyAuth, AuthenticatedRequest } from '../auth/apiKey';
import { searchKeyword, suggestKeywords } from '../services/keyword';

export async function keywordRoutes(app: FastifyInstance) {
  app.post('/api/keyword/search', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const body = request.body as { keyword: string; platform?: string };

    if (!body.keyword) {
      return reply.status(400).send({ error: 'keyword is required' });
    }

    try {
      const result = await searchKeyword(body.keyword, body.platform);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.post('/api/keyword/suggest', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const body = request.body as { seed: string; platform?: string };

    if (!body.seed) {
      return reply.status(400).send({ error: 'seed keyword is required' });
    }

    try {
      const result = await suggestKeywords(body.seed, body.platform);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
