import { FastifyInstance } from 'fastify';
import { apiKeyAuth, AuthenticatedRequest, generateApiKey, listApiKeys, deleteApiKey } from '../auth/apiKey';
import { query } from '../db/pool';
import { config } from '../config';

export async function usageRoutes(app: FastifyInstance) {
  // API usage stats (authenticated)
  app.get('/api/usage', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest) => {
    const keyId = request.apiKeyRecord!.id;

    // Today's usage
    const todayResult = await query(
      `SELECT COUNT(*) as count FROM requests WHERE api_key_id = $1 AND created_at >= CURRENT_DATE`,
      [keyId]
    );

    // Last 7 days daily breakdown
    const weeklyResult = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM requests WHERE api_key_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY date`,
      [keyId]
    );

    // Endpoint breakdown
    const endpointResult = await query(
      `SELECT endpoint, COUNT(*) as count
       FROM requests WHERE api_key_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY endpoint ORDER BY count DESC`,
      [keyId]
    );

    return {
      success: true,
      data: {
        plan: request.apiKeyRecord!.plan,
        dailyLimit: request.apiKeyRecord!.daily_limit,
        todayUsage: parseInt(todayResult.rows[0].count),
        weeklyBreakdown: weeklyResult.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
        endpointBreakdown: endpointResult.rows.map(r => ({ endpoint: r.endpoint, count: parseInt(r.count) })),
      },
    };
  });

  // Admin: generate API key
  app.post('/api/admin/keys', async (request, reply) => {
    const adminKey = request.headers['x-admin-key'] as string;
    if (adminKey !== config.adminKey) {
      return reply.status(403).send({ error: 'Invalid admin key' });
    }

    const body = request.body as { email: string; plan?: string };
    if (!body.email) {
      return reply.status(400).send({ error: 'email is required' });
    }

    const key = await generateApiKey(body.email, body.plan);
    return { success: true, data: { key, email: body.email, plan: body.plan || 'free' } };
  });

  // Admin: list keys
  app.get('/api/admin/keys', async (request, reply) => {
    const adminKey = request.headers['x-admin-key'] as string;
    if (adminKey !== config.adminKey) {
      return reply.status(403).send({ error: 'Invalid admin key' });
    }

    const qs = request.query as { email?: string };
    if (!qs.email) {
      return reply.status(400).send({ error: 'email query param required' });
    }

    const keys = await listApiKeys(qs.email);
    return { success: true, data: keys };
  });

  // Admin: delete key
  app.delete('/api/admin/keys/:id', async (request, reply) => {
    const adminKey = request.headers['x-admin-key'] as string;
    if (adminKey !== config.adminKey) {
      return reply.status(403).send({ error: 'Invalid admin key' });
    }

    const params = request.params as { id: string };
    const qs = request.query as { email: string };
    if (!qs.email) {
      return reply.status(400).send({ error: 'email query param required' });
    }

    const deleted = await deleteApiKey(parseInt(params.id), qs.email);
    return { success: true, deleted };
  });
}
