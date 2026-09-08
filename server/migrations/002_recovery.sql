-- Recovery codes: the second factor that makes a pattern reset possible.
-- Nullable, because gardens created before this migration have no code until
-- their owner asks for one from inside the garden.
ALTER TABLE gardens ADD COLUMN recovery_hash TEXT;
ALTER TABLE gardens ADD COLUMN recovery_issued_at TEXT;
