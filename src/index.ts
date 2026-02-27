import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { config } from './config';
import { pool } from './db/pool';
import { redis } from './db/redis';
import { productRoutes } from './routes/product';
import { keywordRoutes } from './routes/keyword';
import { competitorRoutes } from './routes/competitor';
import { usageRoutes } from './routes/usage';

async function main() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    },
  });

  // CORS
  await app.register(cors, { origin: true });

  // Static files (dashboard)
  await app.register(fastifyStatic, {
    root: join(__dirname, '../web'),
    prefix: '/',
  });

  // Health check
  app.get('/api/health', async () => {
    const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
    const redisOk = await redis.ping().then(() => true).catch(() => false);
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { database: dbOk, redis: redisOk },
    };
  });

  // Register routes
  await app.register(productRoutes);
  await app.register(keywordRoutes);
  await app.register(competitorRoutes);
  await app.register(usageRoutes);

  // API docs endpoint
  app.get('/api/docs', async () => ({
    name: 'S4 Cross-Border Data API',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/api/product/lookup', desc: 'Look up product by ASIN or URL', body: { asin: 'string?', url: 'string?', platform: 'string?' } },
      { method: 'POST', path: '/api/product/price-history', desc: 'Get price history', body: { asin: 'string', platform: 'string?', days: 'number?' } },
      { method: 'POST', path: '/api/keyword/search', desc: 'Search products by keyword', body: { keyword: 'string', platform: 'string?' } },
      { method: 'POST', path: '/api/keyword/suggest', desc: 'Get keyword suggestions', body: { seed: 'string', platform: 'string?' } },
      { method: 'POST', path: '/api/competitor/monitor', desc: 'Add competitor monitor', body: { productId: 'string', platform: 'string?', checkInterval: 'number?', alertOn: 'string[]?' } },
      { method: 'GET', path: '/api/competitor/alerts', desc: 'Get competitor alerts', query: { limit: 'number?', unread: 'boolean?' } },
      { method: 'GET', path: '/api/usage', desc: 'Get API usage stats' },
      { method: 'GET', path: '/api/health', desc: 'Health check (no auth)' },
    ],
    auth: 'Header: X-API-Key',
    plans: {
      free: '100 requests/day',
      pro: '5,000 requests/day',
      enterprise: '50,000 requests/day',
    },
  }));

  // Start
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 S4 Data API running on http://${config.host}:${config.port}`);
    console.log(`📊 Dashboard: http://localhost:${config.port}/`);
    console.log(`📖 API Docs: http://localhost:${config.port}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
