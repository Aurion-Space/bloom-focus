PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gardens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pattern_hash TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id        TEXT NOT NULL REFERENCES gardens(garden_id) ON DELETE CASCADE,
  intention        TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30,45,60,90,120)),
  plant_type       TEXT NOT NULL,
  unique_slug      TEXT NOT NULL UNIQUE,
  completed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_garden  ON sessions(garden_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_slug    ON sessions(unique_slug);

PRAGMA legacy_alter_table=ON;
