CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  stakeholder TEXT NOT NULL,
  specific_identity TEXT,
  note TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_path TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_page_path_idx
ON comments (page_path, created_at);
