-- ApprovalPrep v4.3.0 runtime product admin schema
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, short_description TEXT NOT NULL DEFAULT '', long_description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'usd', status TEXT NOT NULL CHECK(status IN ('draft','live','hidden','revoked','archived')), visibility TEXT NOT NULL DEFAULT 'private', featured_rank INTEGER NOT NULL DEFAULT 100, is_best_value INTEGER NOT NULL DEFAULT 0, stripe_live_product_id TEXT, stripe_live_price_id TEXT, stripe_test_product_id TEXT, stripe_test_price_id TEXT, image_asset_id TEXT, pdf_asset_id TEXT, docx_asset_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT, revoked_at TEXT, revoked_reason TEXT, archived_at TEXT
);
CREATE TABLE IF NOT EXISTS product_assets (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL, asset_type TEXT NOT NULL CHECK(asset_type IN ('image','pdf','docx')), r2_key TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, uploaded_by TEXT NOT NULL DEFAULT 'admin', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS product_audit_log (
  id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, product_id TEXT, before_json TEXT, after_json TEXT, ip_hash TEXT, user_agent TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS download_entitlements (
  id TEXT PRIMARY KEY, stripe_session_id TEXT NOT NULL UNIQUE, product_id TEXT NOT NULL, customer_email TEXT, payment_status TEXT NOT NULL, amount_total INTEGER, currency TEXT, created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY, session_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_assets_product ON product_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_product ON product_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_session ON download_entitlements(stripe_session_id);
