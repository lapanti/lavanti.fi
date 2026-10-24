-- Which payment page a donate click went to: 'form' (/lahjoita, the party's card/bank form)
-- or 'mobilepay' (/mp, MobilePay box 46492). Existing rows were all /lahjoita clicks.
ALTER TABLE donate_clicks ADD COLUMN target TEXT NOT NULL DEFAULT 'form';
