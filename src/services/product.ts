import { query } from '../db/pool';
import { redis } from '../db/redis';
import { scrapeAmazonProduct, searchAmazon } from '../scrapers/amazon';
import { scrapeAliExpressProduct, searchAliExpress } from '../scrapers/aliexpress';
import * as crypto from 'crypto';

function hashParams(params: any): string {
  return crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
}

export async function lookupProduct(input: { asin?: string; url?: string; platform?: string }) {
  let platform = input.platform || 'amazon';
  let productId = input.asin || '';

  // Parse URL if provided
  if (input.url) {
    if (input.url.includes('amazon')) {
      platform = 'amazon';
      const m = input.url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      productId = m ? m[1] : '';
    } else if (input.url.includes('aliexpress')) {
      platform = 'aliexpress';
      const m = input.url.match(/\/item\/(\d+)\.html/);
      productId = m ? m[1] : '';
    }
  }

  if (!productId) throw new Error('Could not determine product ID from input');

  // Check cache (products table, updated within 1 hour)
  const cached = await query(
    `SELECT * FROM products WHERE platform = $1 AND product_id = $2 AND updated_at > NOW() - INTERVAL '1 hour'`,
    [platform, productId]
  );

  if (cached.rows.length > 0) {
    const row = cached.rows[0];
    return {
      cached: true,
      platform,
      productId,
      title: row.title,
      price: parseFloat(row.price),
      currency: row.currency,
      rating: row.rating ? parseFloat(row.rating) : null,
      reviewCount: row.review_count,
      bsr: row.bsr,
      seller: row.seller_name,
      imageUrl: row.image_url,
      data: row.data_json,
      updatedAt: row.updated_at,
    };
  }

  // Scrape fresh data
  let scraped: any;
  if (platform === 'amazon') {
    scraped = await scrapeAmazonProduct(productId);
  } else if (platform === 'aliexpress') {
    scraped = await scrapeAliExpressProduct(productId);
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Upsert into products table
  await query(
    `INSERT INTO products (platform, product_id, title, price, currency, rating, review_count, bsr, seller_name, image_url, data_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (platform, product_id) DO UPDATE SET
       title = EXCLUDED.title, price = EXCLUDED.price, currency = EXCLUDED.currency,
       rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, bsr = EXCLUDED.bsr,
       seller_name = EXCLUDED.seller_name, image_url = EXCLUDED.image_url,
       data_json = EXCLUDED.data_json, updated_at = NOW()`,
    [
      platform, productId, scraped.title,
      scraped.price, scraped.currency || 'USD',
      scraped.rating, scraped.reviewCount || scraped.review_count || null,
      scraped.bsr || null, scraped.seller || null,
      scraped.imageUrl || scraped.image_url || null,
      JSON.stringify(scraped),
    ]
  );

  // Record price history
  if (scraped.price) {
    const prodResult = await query(
      'SELECT id FROM products WHERE platform = $1 AND product_id = $2',
      [platform, productId]
    );
    if (prodResult.rows.length > 0) {
      await query(
        'INSERT INTO price_history (product_id, price, currency) VALUES ($1, $2, $3)',
        [prodResult.rows[0].id, scraped.price, scraped.currency || 'USD']
      );
    }
  }

  return {
    cached: false,
    platform,
    productId,
    title: scraped.title,
    price: scraped.price,
    currency: scraped.currency || 'USD',
    rating: scraped.rating,
    reviewCount: scraped.reviewCount || scraped.review_count || null,
    bsr: scraped.bsr || null,
    seller: scraped.seller || null,
    imageUrl: scraped.imageUrl || scraped.image_url || null,
    data: scraped,
  };
}

export async function getPriceHistory(asin: string, platform = 'amazon', days = 30) {
  const result = await query(
    `SELECT ph.price, ph.currency, ph.recorded_at
     FROM price_history ph
     JOIN products p ON ph.product_id = p.id
     WHERE p.platform = $1 AND p.product_id = $2
       AND ph.recorded_at > NOW() - INTERVAL '1 day' * $3
     ORDER BY ph.recorded_at ASC`,
    [platform, asin, days]
  );

  // Also get current product info
  const product = await query(
    'SELECT title, price, currency FROM products WHERE platform = $1 AND product_id = $2',
    [platform, asin]
  );

  return {
    platform,
    productId: asin,
    title: product.rows[0]?.title || null,
    currentPrice: product.rows[0]?.price ? parseFloat(product.rows[0].price) : null,
    days,
    history: result.rows.map(r => ({
      price: parseFloat(r.price),
      currency: r.currency,
      date: r.recorded_at,
    })),
  };
}
