CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  joined_at TEXT NOT NULL,
  invited_at TEXT,
  source TEXT,
  referred_by TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  invite_code TEXT,
  source TEXT,
  app TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event ON funnel_events(event);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_app ON funnel_events(app);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
