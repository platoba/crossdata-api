import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/pool';
import { redis } from '../db/redis';

export interface AuthenticatedRequest extends FastifyRequest {
  apiKeyRecord?: {
    id: number;
    key: string;
    user_email: string;
    plan: string;
    daily_limit: number;
  };
}

export async function apiKeyAuth(request: AuthenticatedRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;
  if (!apiKey) {
    return reply.status(401).send({ error: 'Missing X-API-Key header' });
  }

  // Check cache first
  const cached = await redis.get(`apikey:${apiKey}`);
  let record: any;

  if (cached) {
    record = JSON.parse(cached);
  } else {
    const result = await query('SELECT id, key, user_email, plan, daily_limit FROM api_keys WHERE key = $1', [apiKey]);
    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }
    record = result.rows[0];
    await redis.set(`apikey:${apiKey}`, JSON.stringify(record), 'EX', 300);
  }

  // Sliding window rate limit
  const today = new Date().toISOString().slice(0, 10);
  const rateLimitKey = `ratelimit:${record.id}:${today}`;
  const currentCount = await redis.incr(rateLimitKey);

  if (currentCount === 1) {
    await redis.expire(rateLimitKey, 86400);
  }

  if (currentCount > record.daily_limit) {
    reply.header('X-RateLimit-Limit', record.daily_limit);
    reply.header('X-RateLimit-Remaining', 0);
    return reply.status(429).send({
      error: 'Daily rate limit exceeded',
      limit: record.daily_limit,
      plan: record.plan,
      upgrade_url: '/dashboard#pricing',
    });
  }

  reply.header('X-RateLimit-Limit', record.daily_limit);
  reply.header('X-RateLimit-Remaining', Math.max(0, record.daily_limit - currentCount));

  request.apiKeyRecord = record;

  // Log request async
  const endpoint = request.url.split('?')[0];
  query('INSERT INTO requests (api_key_id, endpoint, created_at) VALUES ($1, $2, NOW())', [record.id, endpoint]).catch(() => {});
}

export async function generateApiKey(email: string, plan: string = 'free'): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const key = `s4_${plan === 'free' ? 'free' : 'pro'}_${uuidv4().replace(/-/g, '')}`;
  const dailyLimit = plan === 'free' ? 100 : plan === 'pro' ? 5000 : 50000;

  await query(
    'INSERT INTO api_keys (key, user_email, plan, daily_limit) VALUES ($1, $2, $3, $4)',
    [key, email, plan, dailyLimit]
  );

  return key;
}

export async function listApiKeys(email: string) {
  const result = await query(
    'SELECT id, key, plan, daily_limit, created_at FROM api_keys WHERE user_email = $1 ORDER BY created_at DESC',
    [email]
  );
  return result.rows;
}

export async function deleteApiKey(keyId: number, email: string) {
  const result = await query(
    'DELETE FROM api_keys WHERE id = $1 AND user_email = $2 RETURNING id',
    [keyId, email]
  );
  return result.rowCount! > 0;
}
