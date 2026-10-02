-- D1 schema for the volunteer sign-up and the counted /lahjoita shortcut.
-- Apply: npx wrangler d1 execute lavanti-fi --remote --file=migrations/0001_volunteers.sql
-- Retention: volunteers are deleted after 2027-07-31, clicks after 13 months
-- (.github/workflows/volunteer-purge.yml).

CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    lang TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    municipality TEXT NOT NULL,
    help TEXT NOT NULL,
    utm_source TEXT,
    utm_campaign TEXT,
    consent_at TEXT NOT NULL,
    consent_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS volunteers_created_at ON volunteers (created_at);

CREATE TABLE IF NOT EXISTS donate_clicks (
    ts TEXT NOT NULL,
    utm_source TEXT,
    utm_campaign TEXT
);

CREATE INDEX IF NOT EXISTS donate_clicks_ts ON donate_clicks (ts);
