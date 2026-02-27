import { query } from '../db/pool';

export async function addMonitorTask(apiKeyId: number, productId: string, platform: string, options: {
  checkInterval?: number;
  alertOn?: string[];
}) {
  // Ensure product exists
  let prodResult = await query(
    'SELECT id FROM products WHERE platform = $1 AND product_id = $2',
    [platform, productId]
  );

  if (prodResult.rows.length === 0) {
    // Create placeholder product
    await query(
      'INSERT INTO products (platform, product_id, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [platform, productId]
    );
    prodResult = await query(
      'SELECT id FROM products WHERE platform = $1 AND product_id = $2',
      [platform, productId]
    );
  }

  const dbProductId = prodResult.rows[0].id;

  // Check if already monitoring
  const existing = await query(
    'SELECT id FROM monitor_tasks WHERE api_key_id = $1 AND product_id = $2 AND active = TRUE',
    [apiKeyId, dbProductId]
  );

  if (existing.rows.length > 0) {
    return { id: existing.rows[0].id, status: 'already_monitoring' };
  }

  const result = await query(
    `INSERT INTO monitor_tasks (api_key_id, product_id, check_interval, alert_on)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      apiKeyId,
      dbProductId,
      options.checkInterval || 3600,
      JSON.stringify(options.alertOn || ['price_change', 'rating_change', 'stock_change']),
    ]
  );

  return { id: result.rows[0].id, status: 'created' };
}

export async function getAlerts(apiKeyId: number, limit = 50, unreadOnly = false) {
  const whereClause = unreadOnly ? 'AND a.read = FALSE' : '';
  const result = await query(
    `SELECT a.id, a.alert_type, a.old_value, a.new_value, a.read, a.created_at,
            p.platform, p.product_id, p.title
     FROM alerts a
     JOIN monitor_tasks mt ON a.monitor_task_id = mt.id
     JOIN products p ON mt.product_id = p.id
     WHERE mt.api_key_id = $1 ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [apiKeyId, limit]
  );

  return result.rows;
}

export async function getMonitorTasks(apiKeyId: number) {
  const result = await query(
    `SELECT mt.id, mt.check_interval, mt.last_checked, mt.alert_on, mt.active, mt.created_at,
            p.platform, p.product_id, p.title, p.price
     FROM monitor_tasks mt
     JOIN products p ON mt.product_id = p.id
     WHERE mt.api_key_id = $1
     ORDER BY mt.created_at DESC`,
    [apiKeyId]
  );
  return result.rows;
}
