CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  salt_b64 TEXT NOT NULL,
  hash_b64 TEXT NOT NULL,
  n INTEGER NOT NULL,
  r INTEGER NOT NULL,
  p INTEGER NOT NULL,
  dklen INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  hidden INTEGER NOT NULL DEFAULT 0,
  created_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  expires_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  record_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_utc TEXT NOT NULL,
  library TEXT NOT NULL DEFAULT 'corpus',
  filename TEXT,
  content_type TEXT,
  object_key TEXT,
  byte_size INTEGER,
  author TEXT,
  domain TEXT,
  subjects TEXT,
  keywords TEXT
);
CREATE INDEX IF NOT EXISTS idx_records_library ON records(library);
CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_utc);
CREATE INDEX IF NOT EXISTS idx_records_title ON records(title);
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  event_date TEXT,
  place_name TEXT,
  lat REAL,
  lon REAL,
  title TEXT,
  record_id TEXT,
  created_by TEXT,
  created_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  created_by TEXT,
  created_utc TEXT NOT NULL
);

ALTER TABLE records ADD COLUMN author TEXT;
ALTER TABLE records ADD COLUMN domain TEXT;
ALTER TABLE records ADD COLUMN subjects TEXT;
ALTER TABLE records ADD COLUMN keywords TEXT;

CREATE TABLE IF NOT EXISTS places (
  geonameid INTEGER PRIMARY KEY,
  name TEXT,
  asciiname TEXT,
  lat REAL,
  lon REAL,
  feature_class TEXT,
  feature_code TEXT,
  country_code TEXT,
  admin1 TEXT,
  population INTEGER,
  alias_norm TEXT
);
CREATE INDEX IF NOT EXISTS idx_places_alias ON places(alias_norm);
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
CREATE TABLE IF NOT EXISTS packages (
  package_id TEXT PRIMARY KEY,
  kind TEXT,
  package_type TEXT,
  version TEXT,
  sha256 TEXT,
  status TEXT,
  object_key TEXT,
  created_utc TEXT
);
CREATE TABLE IF NOT EXISTS historical_layers (
  layer_id TEXT PRIMARY KEY,
  name TEXT,
  valid_from TEXT,
  valid_to TEXT,
  feature_count INTEGER,
  confidence REAL,
  source_name TEXT,
  license TEXT,
  attribution TEXT,
  source_sha256 TEXT,
  geojson TEXT,
  created_utc TEXT
);
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id TEXT PRIMARY KEY,
  record_id TEXT,
  status TEXT,
  result TEXT,
  created_utc TEXT
);
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
ALTER TABLE events ADD COLUMN confidence REAL;
ALTER TABLE events ADD COLUMN source TEXT;
ALTER TABLE events ADD COLUMN status TEXT;
ALTER TABLE events ADD COLUMN historical_json TEXT;

CREATE TABLE IF NOT EXISTS ledger (
  sequence INTEGER PRIMARY KEY,
  timestamp_utc TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS derived_artifacts (
  derived_id TEXT PRIMARY KEY,
  record_id TEXT,
  artifact_type TEXT,
  processor TEXT,
  processor_version TEXT,
  content_sha256 TEXT,
  created_utc TEXT,
  status TEXT,
  object_key TEXT,
  note TEXT
);
ALTER TABLE derived_artifacts ADD COLUMN object_key TEXT;
ALTER TABLE derived_artifacts ADD COLUMN note TEXT;
ALTER TABLE records ADD COLUMN content_sha256 TEXT;
CREATE INDEX IF NOT EXISTS idx_records_sha ON records(content_sha256);
ALTER TABLE records ADD COLUMN quarantine_status TEXT;
ALTER TABLE records ADD COLUMN review_json TEXT;
ALTER TABLE records ADD COLUMN bayesian_posterior REAL;
ALTER TABLE records ADD COLUMN lattice_tip_json TEXT;
CREATE TABLE IF NOT EXISTS peer_reviews (
  review_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  stance TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT,
  created_utc TEXT NOT NULL,
  entry_hash TEXT
);
CREATE TABLE IF NOT EXISTS lattice_tips (
  tip_id TEXT PRIMARY KEY,
  record_id TEXT,
  tip_json TEXT NOT NULL,
  created_utc TEXT NOT NULL,
  ledger_entry_hash TEXT
);
