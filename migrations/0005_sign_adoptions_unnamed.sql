-- Adoptoi kyltti without a name on the sign (spec: .agents/specs/sign-adoption/spec.md).
-- Apply after 0004: npx wrangler d1 execute lavanti-fi --remote --file=migrations/0005_sign_adoptions_unnamed.sql
--
-- `named` is 0 for a donation for signs without the donor's name on them; such a row has no
-- sign_name and no print consent. SQLite cannot drop NOT NULL in place, so the table is rebuilt
-- with the same columns (explicit lists, so nothing is copied into the wrong column).

CREATE TABLE sign_adoptions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lang TEXT NOT NULL,
    named INTEGER NOT NULL DEFAULT 1,
    sign_name TEXT,
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
    consent_print_at TEXT,
    consent_public_at TEXT,
    consent_page_at TEXT,
    consent_company_at TEXT,
    consent_version TEXT NOT NULL,
    utm_source TEXT,
    utm_campaign TEXT,
    approved_at TEXT,
    paid_via TEXT,
    printed_at TEXT,
    CHECK (named IN (0, 1)),
    CHECK (named = 0 OR (sign_name IS NOT NULL AND consent_print_at IS NOT NULL))
);

INSERT INTO sign_adoptions_new (
    id, created_at, status, lang, named, sign_name, quantity, municipality, email, payer_name,
    company_name, business_id, billing_address, public, message, message_at, message_approved_at,
    ref_code, edit_token_hash, consent_print_at, consent_public_at, consent_page_at,
    consent_company_at, consent_version, utm_source, utm_campaign, approved_at, paid_via, printed_at
)
SELECT
    id, created_at, status, lang, 1, sign_name, quantity, municipality, email, payer_name,
    company_name, business_id, billing_address, public, message, message_at, message_approved_at,
    ref_code, edit_token_hash, consent_print_at, consent_public_at, consent_page_at,
    consent_company_at, consent_version, utm_source, utm_campaign, approved_at, paid_via, printed_at
FROM sign_adoptions;

DROP TABLE sign_adoptions;
ALTER TABLE sign_adoptions_new RENAME TO sign_adoptions;
CREATE INDEX IF NOT EXISTS sign_adoptions_status ON sign_adoptions (status, created_at);
