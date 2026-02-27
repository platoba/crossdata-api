import { FastifyInstance } from 'fastify';
import { apiKeyAuth, AuthenticatedRequest } from '../auth/apiKey';
import { addMonitorTask, getAlerts, getMonitorTasks } from '../services/competitor';

export async function competitorRoutes(app: FastifyInstance) {
  app.post('/api/competitor/monitor', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const body = request.body as {
      productId: string;
      platform?: string;
      checkInterval?: number;
      alertOn?: string[];
    };

    if (!body.productId) {
      return reply.status(400).send({ error: 'productId is required' });
    }

    try {
      const result = await addMonitorTask(
        request.apiKeyRecord!.id,
        body.productId,
        body.platform || 'amazon',
        { checkInterval: body.checkInterval, alertOn: body.alertOn }
      );
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.get('/api/competitor/alerts', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    const qs = request.query as { limit?: string; unread?: string };

    try {
      const alerts = await getAlerts(
        request.apiKeyRecord!.id,
        qs.limit ? parseInt(qs.limit) : 50,
        qs.unread === 'true'
      );
      return { success: true, data: alerts };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.get('/api/competitor/tasks', { preHandler: apiKeyAuth as any }, async (request: AuthenticatedRequest, reply) => {
    try {
      const tasks = await getMonitorTasks(request.apiKeyRecord!.id);
      return { success: true, data: tasks };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
