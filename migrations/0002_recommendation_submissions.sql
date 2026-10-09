-- D1 schema for the pending submissions of the /suosittele recommendation form.
-- Apply: npx wrangler d1 execute lavanti-fi --remote --file=migrations/0002_recommendation_submissions.sql
-- The photo is the R2 object submissions/<id> in the RECOMMENDATION_PHOTOS bucket.
-- Retention: approve and reject delete the row and the photo; anything left is deleted after
-- 55 days (.github/workflows/volunteer-purge.yml for rows, an R2 lifecycle rule for photos).

CREATE TABLE IF NOT EXISTS recommendation_submissions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    title_fi TEXT NOT NULL,
    title_sv TEXT,
    title_en TEXT,
    recommendation TEXT NOT NULL,
    photo_type TEXT NOT NULL,
    consent_at TEXT NOT NULL,
    consent_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS recommendation_submissions_created_at ON recommendation_submissions (created_at);
