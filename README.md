# CrossData API 📊

> E-commerce data API for cross-border sellers. Product lookup, price tracking, keyword research, and competitor monitoring.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## What It Does

CrossData turns web scraping into a clean, rate-limited API. Cross-border e-commerce sellers can look up products, track prices, research keywords, and monitor competitors — all through simple REST endpoints.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/product/lookup` | Product info by ASIN or URL |
| POST | `/api/product/price-history` | 30-day price trend |
| POST | `/api/keyword/search` | Top 20 products for a keyword |
| POST | `/api/keyword/suggest` | Related long-tail keywords |
| POST | `/api/competitor/monitor` | Set up competitor tracking |
| GET | `/api/competitor/alerts` | Get change alerts |
| GET | `/api/usage` | Your API usage stats |

### Example: Product Lookup

```bash
curl -X POST http://localhost:3500/api/product/lookup \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"asin": "B09V3KXJPB", "platform": "amazon"}'
```

```json
{
  "title": "Echo Dot (5th Gen)",
  "price": 49.99,
  "currency": "USD",
  "rating": 4.6,
  "reviewCount": 125432,
  "bsr": 15,
  "category": "Smart Speakers",
  "images": ["https://..."],
  "seller": "Amazon.com"
}
```

## Features

- 🔍 **Multi-Platform** — Amazon, AliExpress (extensible to Shopee, Lazada, 1688)
- 📈 **Price History** — 30-day price tracking with daily snapshots
- 🔑 **Keyword Research** — Search results + long-tail suggestions
- 👀 **Competitor Monitoring** — Price/stock/review change alerts
- ⚡ **Redis Caching** — Fast responses, reduced scraping load
- 🔒 **Rate Limiting** — Sliding window per API key
- 📊 **Usage Dashboard** — Built-in analytics UI

## Quick Start

```bash
git clone https://github.com/platoba/crossdata-api.git
cd crossdata-api

cp .env.example .env
docker compose up -d
```

## Pricing Tiers (Self-hosted)

Configure in your deployment:

| Plan | Daily Limit | Features |
|------|-------------|----------|
| Free | 100 | Basic lookup |
| Starter | 5,000 | + Price history |
| Pro | 50,000 | + Monitoring + Webhooks |
| Unlimited | ∞ | Everything |

## Tech Stack

- **API**: Fastify + TypeScript
- **Scraping**: Cheerio + configurable proxy
- **Database**: PostgreSQL (products, prices, tasks)
- **Cache**: Redis (rate limiting + hot data)
- **Frontend**: Tailwind CSS dashboard

## License

MIT © 2026
