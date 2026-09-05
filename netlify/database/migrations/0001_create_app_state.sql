-- Cross-device sync store for BHMS.
-- The whole application document (the `db` object) is kept as a single JSONB row
-- so every device loads and saves the same shared hospital data.
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0
);
