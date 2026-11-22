-- Google Play review access (functions/_runtime/review.js). Additive only: two new tables, nothing altered.
-- No raw app user ID, IP or code is stored: id_hash and key are HMACs with the REVIEW_HASH_SECRET secret.
CREATE TABLE IF NOT EXISTS schema_version (migration TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS review_grant (window_id TEXT NOT NULL, id_hash TEXT NOT NULL, granted_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY (window_id, id_hash));
CREATE TABLE IF NOT EXISTS review_try (bucket TEXT NOT NULL, key TEXT NOT NULL, tries INTEGER NOT NULL, until INTEGER NOT NULL, PRIMARY KEY (bucket, key));
INSERT OR IGNORE INTO schema_version (migration) VALUES ('0001_runtime_product_admin');
INSERT OR IGNORE INTO schema_version (migration) VALUES ('0002_review');
