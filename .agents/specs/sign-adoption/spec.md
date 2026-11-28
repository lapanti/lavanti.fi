# Spec: Adopt a campaign sign (Adoptoi kyltti)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-11-28

---

## Intent

A visitor donates 30 euros per campaign sign to the support association's election fundraiser
(vaalikeräys). As thanks, their name goes on a round white sticker on a roadside sign ("Tämän
kyltin adoptoi" over the name), visibly separate from the campaign text. The page turns a small donation into something the donor
can picture, share and point at in spring.

The association, Digitaalisen itsenäisyyden puolesta ry, orders and pays for every sign; each sign
carries "Mainoksen maksaja: Digitaalisen itsenäisyyden puolesta ry". The donation is plain support
under the Act on a Candidate's Election Funding (273/2009): row 2.3 for a private person, 2.4 for a
company; a 6 000 euro cap and a 2 000 euro disclosure threshold per giver across all channels; the
giver must be known; no public bodies, no companies they control, no foreign companies. There is no
VAT and the donation is not tax-deductible. The name is a thank-you, never a purchase.

All three locales (fi, sv, en) launch together. There is no "first 20" hook.

---

## Scope

### In scope
- Landing pages `/fi/adoptoi/`, `/sv/adoptera/`, `/en/adopt/` with a live sign preview, quantity
  chips and a two-step form (step 2 on the same page, no reload).
- Payment pages `/fi/adoptoi/lahjoita/`, `/sv/adoptera/donera/`, `/en/adopt/donate/` (noindex):
  MobilePay 46492, the ref and a bank transfer (or the invoice note for companies), then
  "Lahjoitin" on to the thanks page.
- Thanks pages `/fi/adoptoi/kiitos/`, `/sv/adoptera/tack/`, `/en/adopt/thanks/` (noindex): only the
  thanks, a share text and one 3:4 share image, each copied or downloaded with one click.
- D1 table `sign_adoptions` and the Pages Functions under `/api/adoptoi*`.
- Owner CLI `npm run adoptions` (moderation, approval, print list, revocation, personal pages).
- Opt-in personal pages `/<lang-base>/<slug>/` built statically from `src/content/adoptionPages.json`.
- Privacy notice sections (fi/sv/en), retention in `volunteer-purge.yml`, entry points from the
  election, join and campaign finance pages.

### Out of scope
- Gift adoptions with a third party's name (v1.1, needs a recipient consent link).
- `ADOPTION_CLOSES`, the closing date in the intro and a narrowed municipality list (phase B, once
  the print deadline is known).
- Logos on signs. Companies get their name as text only.
- Any refund flow. Revocation withdraws the name licence only.

---

## Architecture

```
/fi/adoptoi/ · /sv/adoptera/ · /en/adopt/        landing (indexed, OG card from frontmatter)
/…/lahjoita/ · /…/donera/ · /…/donate/          payment step (noindex, X-Robots-Tag, not in sitemap)
/…/kiitos/ · /…/tack/ · /…/thanks/               thanks (noindex, X-Robots-Tag, not in sitemap)
/…/<slug>/                                       personal page (noindex, not in sitemap, own OG card)

POST   /api/adoptoi            Turnstile + validate → pending row → JSON {ref, token}
                               (Accept: application/json) or 303 lahjoita?ref&n&y (no JS)
POST   /api/adoptoi/viesti     ref + token → message (≤ 140) and/or payer_name, from the payment step
GET    /api/adoptoi/maksu      {enabled}; ?ref=K-NNNNN → {state: paid|pending|failed} (settles too)
POST   /api/adoptoi/maksu      ref + token → MobilePay online payment → {redirectUrl}
POST   /api/adoptoi/mobilepay  Vipps MobilePay webhook (HMAC-signed) → settles the payment
GET    /api/adoptoi/seina      public, Cache-Control: public, max-age=60 → the wall
GET    /api/adoptoi/pending    Bearer ADOPTIONS_TOKEN [?status=approved] → rows
POST   /api/adoptoi/:id        Bearer ADOPTIONS_TOKEN, JSON {action[, paid_via]}
DELETE /api/adoptoi/:id        Bearer ADOPTIONS_TOKEN → revoke (row deleted)
GET    /api/adoptoi/stats      Bearer LIITY_STATS_TOKEN [?since=YYYY-MM-DD] → counts
local  npm run adoptions -- list | approve | reject | approve-message | reject-message
                            | revoke | print | page add | page remove | mobilepay-webhook
```

- **Logic:** `src/lib/signAdoptions.ts`; the Functions in `functions/api/adoptoi*` are thin
  wrappers, like `functions/api/liity.ts`. Shared helpers come from `src/lib/formHandling.ts`;
  `suppress()` comes from `src/lib/volunteers.ts`.
- **Browser code:** pure helpers in `src/lib/adoptionClient.ts` and `src/lib/adoptionShareImage.ts`
  (unit-tested); DOM glue in `src/components/adoption/*.client.ts`, loaded with
  `<script src="./x.client.ts">` (Prettier would mangle an inline module script) and listed as knip
  entries. Strings the scripts need reach them as JSON in `<script type="application/json">`.
- **Layout:** every adoption page uses `PageLayout` `variant: 'split'`, the same hero as the rest of
  the site. Landing: eyebrow "Lauri Lavanti, Vihreiden eduskuntavaaliehdokas Uudellamaalla", H1
  "Adoptoi kyltti." + emphasis "Nimesi nousee tienvarteen.", the direct-ask paragraph as `intro`,
  and a CTA "Kirjoita nimesi kylttiin" (`#adoptoi`) that scrolls to the form plate. The headline is
  there to make the visitor scroll; the form is one tap or one swipe away. The landing pages set
  `heroSign: true`: the hero shows the sign with the ghost name (decorative, `aria-hidden`, not
  updated by typing) in place of the photo, which is then not preloaded; `heroImage` stays only
  for the OG card portrait. The CTA stays on the first screen at 375 × 812. Payment pages: H1
  "Kylttisi odottaa" + emphasis "lahjoitustasi", CTA "Viimeistele adoptio" (`#lahjoitus`) to the
  payment plate, and a question heading ("Mitä seuraavaksi?") for the AEO check. Thanks pages: H1
  "Kiitos" + emphasis "lahjoituksesta", CTA "Jaa kylttisi" (`#jaa`), plate heading "Kerrotko
  kyltistäsi kavereillesi?". Personal pages
  pass `ogCard` to `PageLayout` to keep the generated card on a noindex page.
- **Checks:** `npm run check:adoption-pages` runs the personal page rule by hand.
- **Copy:** `src/content/signAdoption.ts`, `Record<Lang, …>`, including the confirmation email
  templates. Finnish is the source; sv/en are faithful translations. `SIGN_TEXT` is per locale:
  sv shows a Swedish sign ("Riksdagsvalet 2027 · Nyland", "Annonsens betalare: …"), en the
  Finnish one. Amounts in new strings keep a no-break space before "€".
- **Bindings:** D1 `DB`; secrets `TURNSTILE_SECRET`, `ADOPTIONS_TOKEN` (new) and `LIITY_STATS_TOKEN`.
  MobilePay online (optional, see below): `MOBILEPAY_CLIENT_ID`, `MOBILEPAY_CLIENT_SECRET`,
  `MOBILEPAY_SUBSCRIPTION_KEY`, `MOBILEPAY_MSN`, `MOBILEPAY_WEBHOOK_SECRET`, and `MOBILEPAY_API`
  (`https://apitest.vipps.no` for the test environment; production when unset).

### MobilePay online

The payment step can open MobilePay with the amount already filled in, through the Vipps MobilePay
[ePayment API](https://developer.vippsmobilepay.com/api/epayment/) directly (no payment service
provider). It is off until all four API keys are set; until then the page shows only number 46492, as before.
Client: `src/lib/mobilePay.ts` (fetch and Web Crypto, no imports).

- **Switch:** `GET /api/adoptoi/maksu` → `{enabled}`. The page asks on load. Online mode needs the edit
  token in sessionStorage; without it (no script, another browser) the page keeps the number.
- **Start:** the button "Lahjoita 100 € MobilePayllä" posts `{ref, token}`. The server checks the token,
  refuses a company, a paid or a handled row (409), creates a `WEB_REDIRECT` payment for the package
  price in euro cents with `profile.scope = "name"`, stores the reference in `mp_reference` and
  returns `redirectUrl`. Reference: `adoptoi-K-NNNNN-<time base36>`, new per attempt (the API wants
  8–64 characters, and an aborted or expired reference can't be reused). Description:
  `mobilePay.paymentDescription` per locale. On an error the page says so and shows the number again.
- **Return:** MobilePay sends the donor to the payment step with `&mp=1`. The page polls
  `GET /api/adoptoi/maksu?ref=` every 2 s, 15 times: `paid` → the thanks page; `failed` → "Lahjoitus
  jäi kesken…" and the button again; still `pending` → "Emme ole vielä saaneet vahvistusta…" and the
  number stays hidden, so nobody donates twice. The phone often opens the return URL in a new tab
  without sessionStorage, so the status check takes the ref alone and answers only paid, pending or
  failed (an unknown ref reads as failed).
- **Settle:** the webhook (`epayments.payment.authorized.v1`, signature checked with
  `MOBILEPAY_WEBHOOK_SECRET`) and the status check share one step. It finds the row from the ref inside
  the reference, reads the payment from the API (never trusting a webhook body), captures what is
  reserved and sets `paid_at`, `paid_via = 'mobilepay'` and `payer_name` from the shared name. A paid row
  or a rejected row gets no capture; that reservation lapses.
- **Owner:** the row stays `pending` until `approve`; names still need moderation. `list` shows
  "MAKSETTU MobilePayllä"; `approve` keeps `paid_via`; `reject` on a paid row reminds to refund it in the
  MobilePay portal. The payer-name field is not shown in online mode.
- **Setup:** order online payments for the MobilePay account in portal.vippsmobilepay.com; the
  Developer section gives the test keys. Set the keys (with `MOBILEPAY_API=https://apitest.vipps.no`)
  in Pages and `.env`, apply migration 0006, then run
  `npm run adoptions -- mobilepay-webhook https://<host>/api/adoptoi/mobilepay` once per environment and
  store the printed secret as `MOBILEPAY_WEBHOOK_SECRET`.

### Submit

| Field | Rule |
|---|---|
| `lang` | `fi` · `sv` · `en` |
| `unnamed` | optional `yes`: a donation for signs without the donor's name on them (see No name on the sign). `sign_name`, `consent_print`, `consent_person`, `public` and `page` are then ignored and not required |
| `sign_name` | NFC-normalised, whitespace collapsed, 2–24 characters. Letters (`\p{L}`), space, hyphen, apostrophe (`'` `’`), period. Digits and `&` only when `company_name` is set. |
| `quantity` | a package sign count: 1, 2, 3, 5 or 10 (`src/lib/signPackages.ts`); anything else is `quantity` |
| `municipality` | one of the 25 municipalities of the Uusimaa electoral district (Uusimaa without Helsinki) or `ei-toivetta` |
| `email` | same rule as the volunteer form |
| `company_name` | optional, ≤ 100. When set: `business_id` (Y-tunnus, checksum-valid), `billing_address` (≤ 200, email or e-invoice address) and `consent_company=yes` are required |
| `consent_print` | must be `yes` |
| `consent_person` | must be `yes` |
| `public` | optional `yes`: the name may appear in the adopters list |
| `page` | optional `yes`: personal page; implies `public` |
| `website` | honeypot, must be empty |
| `utm_source`, `utm_campaign` | optional slugs, `utmSlug()` |

- **Y-tunnus checksum:** `NNNNNNN-C`, weights 7, 9, 10, 5, 8, 4, 2; `r = sum mod 11`; `r = 0` → `C = 0`,
  `r = 1` → invalid, else `C = 11 − r`.
- **Ref:** `K-` + 5 random digits, `UNIQUE`; the insert retries on a collision.
- **Edit token:** 128 random bits, base64url. Only its SHA-256 is stored. Returned once, kept in
  `sessionStorage` with the sign name, never in a URL.
- **Errors:** a fixed code, never the input. JSON clients get `{error}` with 400 (503 for
  `palvelu`); form posts get `303 <form>?virhe=<code>#lomake`. A filled honeypot answers like a
  success and stores nothing.
- **Stored per row:** the fields above, `created_at`, `status` (`pending`), `ref_code`,
  `edit_token_hash`, `consent_print_at`, `consent_public_at`, `consent_page_at`,
  `consent_company_at`, `consent_version`, `named`. No IP, user agent or Turnstile token.

### No name on the sign

Owner request 2026-11-16: people can donate for signs without their name on them.

- **Form, step 1:** a checkbox "En halua nimeäni kylttiin" (sv "Jag vill inte ha mitt namn på
  skylten", en "I don't want my name on the sign") under the name field, with the hint "Voit tukea
  kylttejä myös ilman, että nimesi tulee niihin." When it is on, CSS (`:has()`) hides the name field,
  the form sign's sticker and, in step 2, `consent_print`, `consent_person`, `public`, `page` and the
  revocation sentence; the step 2 heading reads "Vielä yhteystietosi." and the pinned line "Kylttisi
  ilman nimeä · 30 €". The CTA and total follow the package price. Email, municipality, the company block and
  Turnstile stay. The script disables the hidden inputs so none are posted; without a script the
  markup has no `required` on them and the server ignores them.
- **Packages:** one sign 30 €, two 55 €, three 80 €, five 100 € (featured with a heavier frame; the page never calls it the most popular), ten 190 €.
  Every bigger package costs more in total and less per sign. Five signs for 100 € is the
  package the page points to: three signs cost nearly as much, and ten signs set the top. There is no
  free count, so four signs can never cost more than five. `SIGN_PACKAGES` is the only price source
  for the form, the payment step and the CLI (`donation`).
- **Storage:** migration `0005_sign_adoptions_unnamed.sql` rebuilds `sign_adoptions` with
  `named INTEGER NOT NULL DEFAULT 1` and nullable `sign_name` and `consent_print_at` (a CHECK keeps
  both set when `named = 1`). An unnamed row has `named = 0`, both NULL, `public = 0`, no page.
- **Thanks:** the payment and thanks URLs get `&u=1`. The name prompt is hidden, and the share PNG
  has no sticker, with "Tuin Lauri Lavannin vaalikylttejä" as the headline and share text "Tuin
  Lauri Lavannin vaalikylttejä, ja keväällä ne nousevat tienvarsille. …".
- **Wall:** unnamed rows count in `signs` and `municipalities`, never in `names` or `messages`
  (`named = 1` in those queries).
- **Giver identity (legal):** the 6 000 € cap and 2 000 € disclosure still need the giver. An
  unnamed private row without `payer_name` is approved only with `--payer "<name>"` from the
  MobilePay report or bank statement; `approve` stores it as `payer_name`.
- **CLI:** `list` marks the row `[EI NIMEÄ KYLTTIIN]`; `print` leaves it out of the CSV, prints the
  count of signs without a sticker and marks it printed; `page add` refuses it; `revoke` writes no
  cover line. The confirmation mail has its own wording without the revocation line.

### Message and payer name (`viesti`)

`{ref, token, message?, payer_name?}`. The token must match the ref (otherwise 404). `message`
(≤ 140) is accepted while the row is pending or up to 7 days after `created_at`; a new message clears
`message_approved_at`. `payer_name` (2–100) only while pending. One write per row per 30 seconds
(429), tracked in `message_at`.

### Wall (`seina`)

Public, no auth. Returns only:

- `signs`: the sum of `quantity` over approved rows, or `null` when fewer than 3 rows are approved.
- `municipalities`: approved sign counts per municipality through `suppress()` (cells under 3 merge
  into `muu`), without `ei-toivetta`.
- `names`: approved rows with `named = 1` and `public = 1`, newest approval first, at most 50; empty when fewer than 3.
- `messages`: `{name, message}` for approved, public rows with an approved message, at most 20.

Never an email, payer, company detail, ref or id.

### Owner flow

- `list`: pending rows and unmoderated messages.
- `approve <id|ref…> [--via mobilepay|tilisiirto|lasku]`: after matching the MobilePay report by ref (or name,
  amount and date). Refuses a sign name with a company-form token (Oy, Oyj, Ab, Ky, Tmi, ry, Osk)
  without `company_name`; warns when `payer_name` differs from the sign name. Sums the approved
  donations per payer (company name, else payer name, else sign name): warns at 2 000 euros
  ("tarkista myös muut kanavat") and stops above 6 000. Prints a ready `mailto:` confirmation per
  row from the templates in `signAdoption.ts`; the owner sends it.
- `reject <id>` · `approve-message <id>` · `reject-message <id>`.
- `print`: approved rows not yet printed → CSV in the gitignored `adoptions-print/`, then marks them
  printed.
- `revoke <id>`: deletes the row. If it was printed, the name is appended to
  `adoptions-print/cover.csv` for the next sign round. If it has a personal page, the CLI says to
  run `page remove`.
- `page add <id>` / `page remove <slug>`: see Personal pages.
- Moderation: reject offensive names and the names of other candidates or public figures.

### Personal pages (static)

An approved row with `consent_page_at` can get a page. `page add <id>` writes one entry
(`slug`, `name`, `lang`, approved `message?`) to `src/content/adoptionPages.json` and commits only
that file on its own branch from `origin/main` (`feat(adoptoi): add page for <slug>`), pushes and
opens the PR. `page remove <slug>` does the same with `chore(adoptoi): remove page for <slug>`.
The page leaves the site on the next deploy; git history keeps the name (no history rewrites,
because a rewrite unsigns commits). The consent text says so.

- Slug: the name lowercased, diacritics stripped, non-alphanumerics collapsed to `-`; never
  `kiitos`, `tack`, `thanks`, `lahjoita`, `donera` or `donate`; unique.
- Page: "{Nimi} adoptoi kyltin", the approved message, the sign, share links, an OG card and
  "Adoptoi sinäkin kyltti" + Liity. `noindex`, not in the sitemap, `llms.txt` or RSS.
- **Repo rule (AGENTS.md):** every page is added, changed or removed in its own commit that touches
  only `adoptionPages.json` and only that entry. `scripts/checks/adoption-pages.ts` enforces it
  from pre-commit (staged) and CI (every commit of the PR). The commit that creates the file is exempt.

### Retention

Pending and rejected rows are deleted 50 days after `created_at`; every row is deleted after
2027-08-30, before the D1 purge token expires on 2027-09-01 (`volunteer-purge.yml`).

---

## Copy (fi source)

Vocabulary in every locale: lahjoitus, kiitos, adoptoi, kummi. Never osta, maksa (for the donation),
sponsori, mainospaikka, näkyvyys; en never buy or sponsor; sv never köp or sponsra. No dashes as
punctuation and no "ei ole X, vaan Y" constructions.

**Landing hero (split):** eyebrow "Lauri Lavanti, Vihreiden eduskuntavaaliehdokas Uudellamaalla" ·
H1 "Adoptoi kyltti." + emphasis "Nimesi nousee tienvarteen." · intro (the direct ask) · CTA
"Kirjoita nimesi kylttiin" → `#adoptoi`.

**Sign graphic:** Lauri's photo over the deep forest name block, the "Mainoksen maksaja" line at
the foot, and a round white sticker where the photo meets the text, right of Lauri (geometry:
`STICKER` in `src/lib/signSticker.ts`, shared by the SVG, the share PNGs and the live preview).
The sticker reads "Tämän kyltin" / "adoptoi" (sv "Den här skylten" / "adopterades av", en
"This sign was" / "adopted by") over the name in Big Shoulders Display bold. A name stays on one
line while it fits large enough, otherwise wraps at a space or after a hyphen (or halfway) onto
two, and shrinks until every line fits the circle; a 24-character name never overflows.

**Form plate, in order:** sign graphic
with ghost text "Sinun nimesi" in the sticker; fine print
"Havainnekuva. Lopullinen kyltti voi poiketa kuvasta." · "30 € = yksi kyltti tienvarteen" ·
"Nimi kylttiin" (maxlength 24, counter; the sign renders the typed value directly, no animation) ·
package cards "1 kyltti · 30 €" (preselected), "2 kylttiä · 55 €" + "27,50 €/kyltti", "3 kylttiä · 80 €"
+ "26,67 €/kyltti", "5 kylttiä · 100 €" + "20 €/kyltti", "10 kylttiä · 190 €" + "19 €/kyltti" → "Lahjoituksesi: 30 €" · always visible "Digitaalisen itsenäisyyden puolesta ry on
tukiyhdistykseni, joka järjestää vaalikeräyksen ja maksaa kyltit." + "Lue, miten kampanjani
rahoitetaan." (link to the campaign finance page) · CTA "Adoptoi kyltti" / "Adoptoi 2 kylttiä" ·
live line from `seina`: "Jo 14 kylttiä on adoptoitu." and "Viimeksi adoptoivat: A, B ja C." (each
only at ≥ 3).

**Below, in order:** intro → why → close + Liity → momentum (count, "Toivotut kunnat") → adopters
list (with the visitor's own pending tile "Nimi (odottaa vahvistusta)" from sessionStorage) →
"Näin lahjoitus toimii" → fallback + QR + Liity. Never seeded names.

- pageTitle "Adoptoi vaalikyltti, nimesi tienvarteen"
- description "Adoptoi vaalikyltti Uudellamaalla lahjoittamalla 30 euroa Lauri Lavannin kampanjalle.
  Kiitokseksi nimesi tulee pyöreään tarraan tienvarren kylttiin."
- Intro "Adoptoi kyltti ja tue kampanjaani 30 eurolla. Se merkitsee minulle paljon. Kiitokseksi
  nimesi tulee kylttiin pyöreään tarraan, ja kyltti nousee keväällä tienvarteen Uudellamaalla."
- Why (verbatim):
  > Suomi on aina varautunut. Meillä on viljaa, lääkkeitä ja polttoainetta varastossa pahan päivän
  > varalle, ja jäänmurtajat pitävät meret auki kovimpanakin talvena. Ennen kriisi katkaisi
  > laivareitit. Nyt siihen voi riittää yksi päätös toisella mantereella.
  >
  > Kun Yhdysvallat asetti pakotteita Kansainvälisen rikostuomioistuimen pääsyyttäjälle, hän menetti
  > pääsyn sähköpostiinsa. Oikeusministeriö ehti jo päättää vaalitietojärjestelmän siirtämisestä
  > Amazonin pilvipalveluun ja perui päätöksen vasta maaliskuussa 2026.
  >
  > Olen yksi Digitaalinen itsenäisyys -kansalaisaloitteen vastuuhenkilöistä, ja yli 50 000
  > suomalaista allekirjoitti sen. Aloite vaatii, että yhteiskunnalle kriittiset julkiset digipalvelut
  > toimisivat EU:ssa sijaitsevilla suomalaisten ja eurooppalaisten toimijoiden palvelimilla ja ettei
  > Suomi jäisi yhden toimittajan varaan. Viemme aloitteen eduskuntaan kevään vaalien jälkeen, ja
  > haluan olla siellä viemässä sitä maaliin. Olen rakentanut yli vuosikymmenen ohjelmistoja ja
  > pankkipalveluja, joihin miljoonien ihmisten on voitava luottaa joka päivä, myös kriisissä.
  >
  > Digitaalinen itsenäisyys on samaa varautumista, jolla Suomi on aina pärjännyt. Kyltti
  > tienvarressa kertoo naapureillesi, että sinäkin haluat Suomen, joka käyttää teknologiaa omilla
  > ehdoillaan.

  + "Kuka olen: Lauri Lavanti" (link to /fi/laurista/).
- Close "Olen Vihreiden eduskuntavaaliehdokas Uudellamaalla. Auta minua viemään nämä asiat
  eduskuntaan." + "Liity mukaan: lavanti.fi/liity"
- Visibility "Nimesi tulee kylttiin pyöreään tarraan, jossa lukee "Tämän kyltin adoptoi" ja
  nimesi. Tarra on erillään kampanjatekstistä. Nimesi näkyy
  niille, jotka kulkevat ohi jalan tai pyörällä. Jos haluat, nimesi näkyy myös adoptoijien
  listalla tällä sivulla."
- Transparency "Kerron budjettini avoimesti koko kampanjan ajan. Vaalirahoitussivulla näet
  budjettini ja sen, mitä kampanjat maksoivat Uudellamaalla vuonna 2023."
- Näin lahjoitus toimii ¶1 "Lahjoitus menee tukiyhdistykseni Digitaalisen itsenäisyyden puolesta
  ry:n vaalikeräykseen. Yhdistys maksaa kyltit, ja nimesi kyltissä on kiitos lahjoituksesta. Samalta
  lahjoittajalta voin ottaa vastaan enintään 6 000 euroa, kun kaikki lahjoitustavat lasketaan
  yhteen. Jos lahjoituksesi ovat yhteensä vähintään 2 000 euroa, nimesi ilmoitetaan
  vaalirahoitusilmoituksessa."
- ¶2 "En voi ottaa vastaan tukea julkisyhteisöiltä, julkisen tahon määräysvallassa olevilta
  yhtiöiltä tai ulkomaisilta yrityksiltä. Yritys voi adoptoida kyltin omalla nimellään, kun lahjoitus
  maksetaan yrityksen tililtä laskulla. Laskussa ei ole arvonlisäveroa, eikä lahjoitus ole
  verotuksessa vähennyskelpoinen. Jos perut luvan nimen käyttöön, peitämme nimen kyltistä ja
  poistamme sen sivustolta."
- Fallback "Jokainen lahjoitus auttaa. Voit lahjoittaa myös haluamasi summan MobilePayllä numerolla
  46492 tai osoitteessa lavanti.fi/lahjoita." + QR + Liity.

**Step 2** "Vielä yhteystieto ja lupa nimen käyttöön." · pinned "Kylttisi: {nimi} · 30 €" (n > 1:
"Kylttisi: {nimi} · 2 kylttiä · 55 €") · "Missä kunnassa toivot kylttisi seisovan?" (hint "Otamme toiveen
huomioon, mutta paikkaa emme voi luvata.") · Sähköposti (hint "Lähetämme vahvistuksen, otamme
yhteyttä, jos nimessä on kysyttävää, ja kerromme, kun kyltit nousevat tienvarsille.") ·
`<details>` "Lahjoitan yrityksenä": yrityksen nimi, Y-tunnus, laskutusosoite, required "Yritys on
suomalainen, eikä se ole julkisyhteisö tai valtion, kunnan tai hyvinvointialueen määräysvallassa." ·
required "Annan luvan kirjoittaa nimeni Lauri Lavannin vaalikylttiin. Tiedän, että nimeni kyltissä
kertoo tukevani hänen ehdokkuuttaan." (n > 1: "vaalikyltteihin", "kylteissä") · required "Nimi on
oma nimeni. Olen täysi-ikäinen." (company block open: "Nimi on oma nimeni tai sen yrityksen nimi,
jota saan edustaa. Olen täysi-ikäinen.") · optional "Nimeni saa näkyä tämän sivun adoptoijien
listalla." · optional "Haluan oman sivun osoitteeseen lavanti.fi/fi/adoptoi/<nimi>/. Sivu on
julkinen, ja nimesi ja viestisi jäävät sivuston julkiseen muutoshistoriaan myös, jos sivu
poistetaan. Voit pyytää sivun poistamista milloin tahansa." · "Voit perua luvan milloin tahansa
vastaamalla vahvistusviestiimme tai kirjoittamalla osoitteeseen lauri@lavanti.fi. Jos perut luvan
nimen käyttöön, peitämme nimen kyltistä ja poistamme sen sivustolta." · Turnstile + honeypot ·
"Seuraavaksi lahjoitat 30 € MobilePayllä ja saat viitekoodin, jonka kirjoitat viestiksi." (the package price;
with a company name: "Seuraavaksi lähetämme 30 euron laskun antamaasi laskutusosoitteeseen.") ·
submit "Adoptoi kyltti" / "Adoptoi 2 kylttiä".

**Payment step** (`/fi/adoptoi/lahjoita/`; the URL carries only validated
`?ref=K-\d{5}&n=1|2|3|5|10&y=0|1[&u=1]`), H1 "Kylttisi odottaa lahjoitustasi", plate heading "Mitä
seuraavaksi?", then in order:
1. The MobilePay block: heading "Melkein valmis: lahjoita 30 € MobilePayllä" (the package price) · "Lahjoita
   30 euroa MobilePayllä numerolla 46492." · copy button · `/mp` button · QR on wide screens ·
   "Kirjoita viestiksi {ref}, niin löydämme lahjoituksesi." + copy · fallback "Eikö sinulla ole
   MobilePayta? Tee tilisiirto:" + Saaja Digitaalisen itsenäisyyden puolesta ry · IBAN
   FI61 5780 3820 2478 06 + "Viesti: viitekoodisi, niin yhdistämme lahjoituksen kylttiisi."
   (owner, 2026-11-15; matched with `approve --via tilisiirto`) · "Maksajan
   nimi, jos maksat toisen henkilön MobilePayllä" (only with the edit token in sessionStorage).
   Then the optional "Miksi adoptoin?" (≤ 140) → `viesti`, public only after moderation and opt-in;
   needs the edit token, hidden for `u=1`, shown for companies too.
2. "Tarkistamme lahjoituksen ja lähetämme vahvistuksen sähköpostiisi." · "Lahjoitin", a link to the
   thanks page with the same query.
   Company (`y=1`): no MobilePay block; "Lähetämme laskun antamaasi laskutusosoitteeseen. Laskussa
   ei ole arvonlisäveroa, koska kyse on lahjoituksesta." and "Jatka" in place of "Lahjoitin".
   Invoice title "Lahjoitus vaalikeräykseen (Adoptoi kyltti)".

**Thanks** (same query), H1 "Kiitos lahjoituksesta", plate heading "Kerrotko kyltistäsi
kavereillesi?", and nothing else but:
1. When sessionStorage holds no name for this ref (and `u` is not set), the "Nimi kylttiin" field,
   so the image carries the name.
2. The share text in a box + "Kopioi teksti" (`clipboard.writeText`, label turns "Kopioitu"). The
   text follows the count: "Adoptoin Lauri Lavannin vaalikyltin, ja keväällä se nousee tienvarteen
   minun nimelläni." or "Adoptoin 5 Lauri Lavannin vaalikylttiä, ja keväällä ne nousevat
   tienvarsille minun nimelläni.", then "Lauri on Vihreiden eduskuntavaaliehdokas Uudellamaalla.
   Adoptoi sinäkin: lavanti.fi/adoptoi".
3. One share PNG, 3:4 at 1080×1440 (the tallest the Instagram app keeps uncropped; the profile grid
   crops to 3:4), drawn on canvas after `FontFace` loads Big Shoulders (latin + latin-ext). Chrome:
   wordmark + Vihreät logo on a top row, 76 px side padding, `lavanti.fi` visible, one stripe run
   at the foot; deep forest ground, never dark green text or rules on it. Headline "Adoptoin Lauri
   Lavannin vaalikyltin" (or "Adoptoin 5 Lauri Lavannin vaalikylttiä") + their sign + "Adoptoi
   sinäkin: lavanti.fi/adoptoi". Under it "Kopioi kuva" (`clipboard.write` with an `image/png`
   `ClipboardItem`, called without an `await` before it so Safari keeps the click; hidden where
   unsupported) and "Lataa kuva" (a download link to the blob). Instagram/Facebook in-app browsers
   get an "Avaa sivu selaimessa" hint.

**Confirmation email** (`approve`, fi): subject "Kylttisi on adoptoitu", body thanks the adopter,
repeats the name and count, says the signs go up in spring and how to revoke the name licence.

---

## Contract

```gherkin
Feature: Adopt a campaign sign

  Scenario: Valid submission
    Given a form with a valid sign name, quantity 2, a municipality, an email, both required consents and a passing Turnstile check
    When it is POSTed to /api/adoptoi with Accept: application/json
    Then one pending row exists with a unique K-NNNNN ref and the hash of the returned token
    And the response is {ref, token} and never echoes the input

  Scenario: Rejected submission
    Given a sign name with digits and no company, a quantity of 4, a bad Y-tunnus or a missing consent
    When it is POSTed
    Then the response carries a fixed error code and nothing is stored

  Scenario: No name on the sign
    Given "En halua nimeäni kylttiin" is on, with a municipality, an email and a passing Turnstile check
    When it is POSTed, with or without a script
    Then one pending row exists with named = 0 and no sign name or print consent
    And the payment and thanks URLs carry u=1, and the share image shows no sticker
    And the row counts on the wall but its name list never includes it

  Scenario: Honeypot
    Given website is non-empty
    When it is POSTed
    Then the response looks like a success and nothing is stored

  Scenario: Wall stays aggregate
    Given 2 approved rows
    When GET /api/adoptoi/seina is called
    Then signs is null, names is empty and no email, payer, company, ref or id appears

  Scenario: Message with a wrong token
    Given a ref and a token that does not match it
    When POST /api/adoptoi/viesti is called
    Then the response is 404 and the row is unchanged

  Scenario: Unauthorized inbox
    Given no bearer token, or the wrong one
    When pending, :id or stats is called
    Then the response is 401 with no data

  Scenario: Thanks page without stored name
    Given /fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0 and empty sessionStorage
    When the page loads
    Then the "Nimi kylttiin" field shows, and typing in it redraws the share image with the name

  Scenario: Payment step leads on
    Given /fi/adoptoi/lahjoita/?ref=K-12345&n=5&y=0
    When the page loads
    Then the amount reads 100 euros and "Lahjoitin" links to /fi/adoptoi/kiitos/?ref=K-12345&n=5&y=0

  Scenario: Invalid thanks parameters
    Given ?ref=<script>&n=99
    When the payment or thanks page loads
    Then no ref or amount is rendered and the page links back to the form

  Scenario: Personal page commit isolation
    Given a staged change to src/content/adoptionPages.json together with any other path, or changing two entries
    When the commit runs
    Then scripts/checks/adoption-pages.ts fails it
```

### Definition of Done
- [ ] Landing, payment, thanks and personal routes build for fi/sv/en; payment, thanks and personal
  pages are noindex and absent from the sitemap; payment and thanks paths send `X-Robots-Tag: noindex`.
- [ ] Unit tests cover the parser, every handler, the share-image layout and the CLI helpers;
  coverage of the new `src/lib` files ≥ 80 %.
- [ ] Privacy notice (fi/sv/en) has the section, with `updatedDate` bumped.
- [ ] E2E covers the steps, preview, chip → CTA label, payment and thanks parameter validation, the
  "Lahjoitin" link, empty sessionStorage on thanks, both copy buttons and a mocked `seina`.

---

## Data Model

`migrations/0004_sign_adoptions.sql`, table `sign_adoptions`: `id` INTEGER PK, `created_at`,
`status` (`pending` · `approved` · `rejected`), `lang`, `sign_name`, `quantity`, `municipality`,
`email`, `payer_name?`, `company_name?`, `business_id?`, `billing_address?`, `public` (0/1),
`message?`, `message_at?`, `message_approved_at?`, `ref_code` UNIQUE, `edit_token_hash`,
`consent_print_at`, `consent_public_at?`, `consent_page_at?`, `consent_company_at?`,
`consent_version`, `utm_source?`, `utm_campaign?`, `approved_at?`, `paid_via?`, `printed_at?`.
`migrations/0006_sign_adoptions_mobilepay.sql` adds `mp_reference?` (the latest online payment
reference) and `paid_at?` (when an online payment was captured).

```typescript
interface AdoptionPage {
    slug: string // [a-z0-9-]+, unique, not kiitos/tack/thanks/lahjoita/donera/donate
    name: string // the approved sign name
    lang: Lang
    message?: string // the approved message, ≤ 140
}
```

---

## Dependencies

- [Recommendation submission form](../recommendations/submission-form.md): the inbox, CLI and
  privacy patterns this feature follows.
- [Campaign finance page](../campaign-finance/spec.md): linked from "Näin lahjoitus toimii".

---

## Anti-patterns

- **Do not** put the edit token, sign name or email in a URL. The payment and thanks URLs carry ref, n, y and u only.
- **Do not** use purchase vocabulary in any locale, or mention refunds.
- **Do not** seed the adopters list or momentum with example names or counts.
- **Do not** show a count, municipality cell or name list below the suppression threshold of 3.
- **Do not** add a `/fi/adoptoi/*` header or sitemap rule that would also noindex the landing page.
- **Do not** mix an `adoptionPages.json` change with any other path in one commit.
- **Do not** write user input into the page with `innerHTML`; use `textContent`.

---

## Open Questions

- [ ] Phase B: `ADOPTION_CLOSES`, the date in the intro and the municipality list narrowed to the
  placement plan. The name length stays at 24 characters: the association buys the signs either
  way and adoption only adds funding, so no printer quote gates it (owner, 2026-11-15).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-11-14 | Initial spec |
| 2026-11-14 | Synced with the implementation: quantity_other, client script pattern, H1/eyebrow layout, ogCard, check script |
| 2026-11-14 | Donor review: direct-ask intro, association line under the total, next-step line and amount in the pinned summary, thanks page pays first with a no-MobilePay fallback, compact phone first screen, Swedish sign on sv, plain-language page consent, copy fixes |
| 2026-11-20 | Sign packages 1/2/3/5/10 for 30/55/80/100/190 €, five featured; the free count is gone |
| 2026-11-21 | Dropped the "Suosituin" badge: the featured package keeps only its heavier frame |
| 2026-11-23 | Payment moved to its own step (`lahjoita`, `donera`, `donate`); the thanks page holds only the thanks, a copyable share text and one 3:4 share image (copy or download), with count-aware copy. The message form, story image and link-sticker hint are gone |
| 2026-11-23 | "Miksi adoptoin?" moved to the payment step (owner) |
| 2026-11-28 | MobilePay online through the ePayment API: a donate button, the return check, webhook and capture, `mp_reference` and `paid_at`; off until the keys are set |
