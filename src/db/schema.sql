-- S4 Data API - Database Schema
-- PostgreSQL

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(64) UNIQUE NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',  -- free | pro | enterprise
  daily_limit INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id),
  endpoint VARCHAR(100) NOT NULL,
  params_hash VARCHAR(64),
  response_cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,        -- amazon | aliexpress | shopee
  product_id VARCHAR(100) NOT NULL,     -- ASIN or platform-specific ID
  title TEXT,
  price NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  rating NUMERIC(3,2),
  review_count INTEGER,
  bsr INTEGER,
  seller_name VARCHAR(255),
  image_url TEXT,
  data_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, product_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  price NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitor_tasks (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id),
  product_id INTEGER REFERENCES products(id),
  check_interval INTEGER DEFAULT 3600,   -- seconds
  last_checked TIMESTAMPTZ,
  alert_on JSONB DEFAULT '["price_change","rating_change","stock_change"]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  monitor_task_id INTEGER REFERENCES monitor_tasks(id),
  alert_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_api_key_id ON requests(api_key_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_products_platform_pid ON products(platform, product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_monitor_tasks_api_key ON monitor_tasks(api_key_id);
CREATE INDEX IF NOT EXISTS idx_alerts_task ON alerts(monitor_task_id, created_at);
