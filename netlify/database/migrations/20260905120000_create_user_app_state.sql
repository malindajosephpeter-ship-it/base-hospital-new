-- Preserve the legacy app_state table and add an authenticated per-user store.
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_app_state (
  owner_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_app_state_updated_at_idx
  ON user_app_state (updated_at DESC);

-- Browser clients never connect to the database directly. Only trusted
-- server-side functions use the owning database connection.
REVOKE ALL ON TABLE user_app_state FROM PUBLIC;
