# CrossData API 📊

> E-commerce data aggregation API: product lookup, price tracking, keyword research, and competitor monitoring.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

## 🎮 Live API

**Try it → [api.omellody.com](https://api.omellody.com)**

---

## What It Does

CrossData aggregates product data from multiple e-commerce platforms into a single, unified API. Search products, track prices, research keywords, and monitor competitors — all from one endpoint.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products/search` | Search products across platforms |
| `GET` | `/api/products/:id` | Get product details |
| `GET` | `/api/prices/track` | Track price history |
| `GET` | `/api/keywords` | Keyword research & volume |
| `GET` | `/api/competitors` | Competitor product monitoring |
| `GET` | `/api/categories` | Browse categories |

### Example

```bash
curl "https://api.omellody.com/api/products/search?q=wireless+earbuds&platform=amazon" \
  -H "X-API-Key: your_key"
```

## Quick Start

```bash
git clone https://github.com/platoba/crossdata-api.git
cd crossdata-api
cp .env.example .env
docker compose up -d
```

## Use Cases

- **Price Comparison Apps** — Build price comparison features
- **Dropshipping Tools** — Find winning products across platforms
- **Market Research** — Track competitor pricing strategies
- **SEO Tools** — E-commerce keyword research data

## Pricing

| Plan | Requests | Price |
|------|----------|-------|
| Free | 100/day | $0 |
| Starter | 5,000/mo | $29/mo |
| Pro | 50,000/mo | $99/mo |
| Enterprise | Custom | Contact us |

## Tech Stack

Node.js + TypeScript + Fastify + PostgreSQL + Redis + Docker

## License

MIT © 2026

---

**⭐ Star this repo if you find it useful!**

Made with ❤️ by [platoba](https://github.com/platoba)
