-- MobilePay online payments for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md § MobilePay online).
-- Apply after 0005: npx wrangler d1 execute lavanti-fi --remote --file=migrations/0006_sign_adoptions_mobilepay.sql
--
-- mp_reference: the latest ePayment reference started for the row (adoptoi-K-NNNNN-<time>).
-- paid_at: when an online payment was captured; paid_via is then 'mobilepay'.

ALTER TABLE sign_adoptions ADD COLUMN mp_reference TEXT;
ALTER TABLE sign_adoptions ADD COLUMN paid_at TEXT;
