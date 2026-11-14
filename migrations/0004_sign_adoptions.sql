-- D1 schema for the Adoptoi kyltti sign adoptions (spec: .agents/specs/sign-adoption/spec.md).
-- Apply: npx wrangler d1 execute lavanti-fi --remote --file=migrations/0004_sign_adoptions.sql
-- Retention: pending and rejected rows are deleted 50 days after created_at, every row after
-- 2027-08-30 (.github/workflows/volunteer-purge.yml).

CREATE TABLE IF NOT EXISTS sign_adoptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lang TEXT NOT NULL,
    sign_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    municipality TEXT NOT NULL,
    email TEXT NOT NULL,
    payer_name TEXT,
    company_name TEXT,
    business_id TEXT,
    billing_address TEXT,
    public INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    message_at TEXT,
    message_approved_at TEXT,
    ref_code TEXT NOT NULL UNIQUE,
    edit_token_hash TEXT NOT NULL,
    consent_print_at TEXT NOT NULL,
    consent_public_at TEXT,
    consent_page_at TEXT,
    consent_company_at TEXT,
    consent_version TEXT NOT NULL,
    utm_source TEXT,
    utm_campaign TEXT,
    approved_at TEXT,
    paid_via TEXT,
    printed_at TEXT
);

CREATE INDEX IF NOT EXISTS sign_adoptions_status ON sign_adoptions (status, created_at);
