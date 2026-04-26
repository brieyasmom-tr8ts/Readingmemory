CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  cover TEXT,
  status TEXT DEFAULT 'want',
  category TEXT,
  sub_category TEXT,
  recommended_by TEXT DEFAULT '',
  recommend INTEGER DEFAULT 0,
  notes_about TEXT DEFAULT '',
  notes_final TEXT DEFAULT '',
  ai_summary TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS custom_subcategories (
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (user_id, category, name),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_book ON entries(book_id);
CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_subs_user ON custom_subcategories(user_id);
