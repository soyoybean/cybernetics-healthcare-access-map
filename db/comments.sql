CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('node', 'edge')),
  target_id TEXT NOT NULL,
  stakeholder_category TEXT NOT NULL,
  stakeholder_detail TEXT,
  note_text TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_target_idx
ON comments (target_type, target_id, timestamp);
