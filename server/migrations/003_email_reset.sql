-- Optional email on a garden, plus single-use reset tokens.
-- Email is nullable and always will be: the QR recovery key stays the primary
-- route, and a garden that never gives an address keeps working exactly as before.
ALTER TABLE gardens ADD COLUMN email TEXT;
ALTER TABLE gardens ADD COLUMN email_added_at TEXT;

CREATE TABLE IF NOT EXISTS reset_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id  TEXT NOT NULL REFERENCES gardens(garden_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,   -- sha256 of the token; the token itself only ever exists in the email
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash   ON reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_garden ON reset_tokens(garden_id, created_at DESC);
