CREATE TABLE IF NOT EXISTS web_messages (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('telegram', 'discord')),
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS web_messages_created_at
ON web_messages (created_at DESC);
