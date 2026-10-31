-- PostgreSQL schema for Nisia POS.
-- Dev: the petcare-postgres container, database nisia_pos (scripts/db-up.sh). Production: any Postgres 14 or later.
-- Apply with scripts/migrate.mjs. The seed is seed/seed.sql.
--
-- Conventions
--   IDs         TEXT, UUID from crypto.randomUUID(). A sale's id is generated on the device, so an offline sale
--               that is sent twice is stored once.
--   Money       INTEGER satang (THB x 100). Never REAL. Prices include VAT when store_settings.vat_mode = 'included'.
--   Timestamps  TIMESTAMPTZ (stored in UTC). The pg driver returns Date objects.
--   Booleans    INTEGER 0/1 with CHECK
--   Stock       products.stock_qty may go below 0: an offline sale can oversell, and the owner reviews it.

CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive email

-- ============================================================
-- Staff and sessions
-- ============================================================

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         CITEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,                       -- pbkdf2$iter$saltHex$hashHex
  role          TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'cashier')),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256(token); the raw token is never stored
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE login_attempts (
  rate_key     TEXT PRIMARY KEY,                     -- "email:<lowercase>" or "ip:<address>"
  failures     INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  window_start TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- Store settings (one row) and counters
-- ============================================================

CREATE TABLE store_settings (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  name                      TEXT NOT NULL,
  address                   TEXT NOT NULL DEFAULT '',
  tax_id                    TEXT NOT NULL DEFAULT '',
  vat_mode                  TEXT NOT NULL DEFAULT 'included' CHECK (vat_mode IN ('included', 'none')),
  vat_bp                    INTEGER NOT NULL DEFAULT 700 CHECK (vat_bp >= 0),          -- basis points: 700 = 7%
  receipt_footer            TEXT NOT NULL DEFAULT '',
  promptpay_id              TEXT NOT NULL DEFAULT '',  -- phone, tax ID or e-Wallet ID for the PromptPay QR
  cashier_discount_limit_bp INTEGER NOT NULL DEFAULT 1000 CHECK (cashier_discount_limit_bp >= 0),  -- above this, a manager approves
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Named counters: receipt numbers per day, e.g. "receipt:2026-10-21".
CREATE TABLE counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0)
);

-- ============================================================
-- Products and stock
-- ============================================================

CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id                  TEXT PRIMARY KEY,
  category_id         TEXT REFERENCES categories (id),
  sku                 TEXT NOT NULL UNIQUE,
  barcode             TEXT UNIQUE,                   -- NULL when the product has no barcode
  name                TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'ชิ้น',
  price_satang        INTEGER NOT NULL CHECK (price_satang >= 0),
  cost_satang         INTEGER NOT NULL DEFAULT 0 CHECK (cost_satang >= 0),
  stock_qty           INTEGER NOT NULL DEFAULT 0,    -- no CHECK: an offline sale can take it below 0
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  image_key           TEXT,                          -- R2 key, NULL when there is no image
  active              INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_active ON products (active, name);

-- Every change to stock is a row here. balance_after is the stock after the change.
CREATE TABLE stock_movements (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL REFERENCES products (id),
  kind          TEXT NOT NULL CHECK (kind IN ('receive', 'sale', 'void', 'adjust')),
  qty_change    INTEGER NOT NULL,                    -- + in, - out
  balance_after INTEGER NOT NULL,
  ref_id        TEXT,                                -- the sale id, when the change comes from a sale
  note          TEXT NOT NULL DEFAULT '',
  actor_id      TEXT NOT NULL REFERENCES users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_product ON stock_movements (product_id, created_at);

-- ============================================================
-- Shifts and cash
-- ============================================================

CREATE TABLE shifts (
  id                   TEXT PRIMARY KEY,
  opened_by            TEXT NOT NULL REFERENCES users (id),
  opened_at            TIMESTAMPTZ NOT NULL,
  opening_cash_satang  INTEGER NOT NULL CHECK (opening_cash_satang >= 0),
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),  -- at most one open, checked in the app
  closed_by            TEXT REFERENCES users (id),
  closed_at            TIMESTAMPTZ,
  expected_cash_satang INTEGER,                      -- opening cash + cash sales + cash in - cash out
  counted_cash_satang  INTEGER CHECK (counted_cash_satang >= 0),
  variance_satang      INTEGER                       -- counted - expected
);
CREATE INDEX idx_shifts_status ON shifts (status, opened_at);

CREATE TABLE cash_movements (
  id            TEXT PRIMARY KEY,
  shift_id      TEXT NOT NULL REFERENCES shifts (id),
  kind          TEXT NOT NULL CHECK (kind IN ('in', 'out')),
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
  reason        TEXT NOT NULL,
  actor_id      TEXT NOT NULL REFERENCES users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_movements_shift ON cash_movements (shift_id);

-- ============================================================
-- Sales
-- ============================================================

CREATE TABLE sales (
  id                   TEXT PRIMARY KEY,             -- generated on the device: the idempotency key for offline sync
  receipt_no           TEXT NOT NULL UNIQUE,
  shift_id             TEXT NOT NULL REFERENCES shifts (id),
  cashier_id           TEXT NOT NULL REFERENCES users (id),
  status               TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  subtotal_satang      INTEGER NOT NULL CHECK (subtotal_satang >= 0),   -- sum of line totals, before the bill discount
  discount_satang      INTEGER NOT NULL DEFAULT 0 CHECK (discount_satang >= 0),
  total_satang         INTEGER NOT NULL CHECK (total_satang >= 0),      -- amount due
  vat_satang           INTEGER NOT NULL DEFAULT 0 CHECK (vat_satang >= 0),  -- the VAT part inside total
  payment_method       TEXT NOT NULL CHECK (payment_method IN ('cash', 'promptpay', 'transfer', 'card')),
  tendered_satang      INTEGER CHECK (tendered_satang >= 0),            -- cash handed over
  change_satang        INTEGER CHECK (change_satang >= 0),
  discount_approved_by TEXT REFERENCES users (id),                      -- set when a manager approved the discount
  offline              INTEGER NOT NULL DEFAULT 0 CHECK (offline IN (0, 1)),
  client_created_at    TIMESTAMPTZ NOT NULL,            -- when the cashier finished the bill, on the device
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when the server stored it
  voided_by            TEXT REFERENCES users (id),
  voided_at            TIMESTAMPTZ,
  void_reason          TEXT
);
CREATE INDEX idx_sales_shift ON sales (shift_id, created_at);
CREATE INDEX idx_sales_created ON sales (created_at);

CREATE TABLE sale_items (
  id                   TEXT PRIMARY KEY,
  sale_id              TEXT NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  product_id           TEXT NOT NULL REFERENCES products (id),
  sku                  TEXT NOT NULL,                 -- snapshot at the time of sale
  name                 TEXT NOT NULL,                 -- snapshot at the time of sale
  unit_price_satang    INTEGER NOT NULL CHECK (unit_price_satang >= 0),
  qty                  INTEGER NOT NULL CHECK (qty > 0),
  line_discount_satang INTEGER NOT NULL DEFAULT 0 CHECK (line_discount_satang >= 0),
  line_total_satang    INTEGER NOT NULL CHECK (line_total_satang >= 0)
);
CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id, sale_id);

-- ============================================================
-- Audit
-- ============================================================

-- Every void, discount approval, stock adjustment, price change and staff change. Never tokens, keys or passwords.
CREATE TABLE audit_log (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT REFERENCES users (id),             -- NULL for the daily job
  action     TEXT NOT NULL,                          -- e.g. sale.void, stock.adjust, product.price_change
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',               -- JSON text
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log (created_at);
