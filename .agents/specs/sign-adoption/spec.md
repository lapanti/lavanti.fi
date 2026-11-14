# Spec: Adopt a campaign sign (Adoptoi kyltti)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-11-14

---

## Intent

A visitor donates 30 euros per campaign sign to the support association's election fundraiser
(vaalikeräys). As thanks, their name is written or printed on the bottom edge of a roadside sign,
visibly separate from the campaign text. The page turns a small donation into something the donor
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
- Thanks pages `/fi/adoptoi/kiitos/`, `/sv/adoptera/tack/`, `/en/adopt/thanks/` (noindex): pay first
  (MobilePay 46492 or invoice for companies), then the thank-you message, share images and an
  optional public message.
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
/…/kiitos/ · /…/tack/ · /…/thanks/               thanks (noindex, X-Robots-Tag, not in sitemap)
/…/<slug>/                                       personal page (noindex, not in sitemap, own OG card)

POST   /api/adoptoi            Turnstile + validate → pending row → JSON {ref, token}
                               (Accept: application/json) or 303 thanks?ref&n&y (no JS)
POST   /api/adoptoi/viesti     ref + token → message (≤ 140) and/or payer_name
GET    /api/adoptoi/seina      public, Cache-Control: public, max-age=60 → the wall
GET    /api/adoptoi/pending    Bearer ADOPTIONS_TOKEN [?status=approved] → rows
POST   /api/adoptoi/:id        Bearer ADOPTIONS_TOKEN, JSON {action[, paid_via]}
DELETE /api/adoptoi/:id        Bearer ADOPTIONS_TOKEN → revoke (row deleted)
GET    /api/adoptoi/stats      Bearer LIITY_STATS_TOKEN [?since=YYYY-MM-DD] → counts
local  npm run adoptions -- list | approve | reject | approve-message | reject-message
                            | revoke | print | page add | page remove
```

- **Logic:** `src/lib/signAdoptions.ts`; the Functions in `functions/api/adoptoi*` are thin
  wrappers, like `functions/api/liity.ts`. Shared helpers come from `src/lib/formHandling.ts`;
  `suppress()` comes from `src/lib/volunteers.ts`.
- **Browser code:** pure helpers in `src/lib/adoptionClient.ts` and `src/lib/adoptionShareImage.ts`
  (unit-tested); DOM glue in `src/components/adoption/*.client.ts`, loaded with
  `<script src="./x.client.ts">` (Prettier would mangle an inline module script) and listed as knip
  entries. Strings the scripts need reach them as JSON in `<script type="application/json">`.
- **Layout:** `PageLayout` `variant: 'page'` renders neither eyebrow nor emphasis, so the H1 holds
  both sentences ("Adoptoi kyltti. Nimesi nousee tienvarteen."), `ogTitle`/`ogEmphasis` split them
  on the card, and the eyebrow sits on the form plate under the H1. The landing pages set
  `compactBanner: true` (no empty band above the H1 and a 24 px stripe at ≤ 768 px) and pass
  `tight` to the form plate, so the price, the sign with the typed name and the name field fit a
  375×812 first screen; desktop is unchanged. The thanks pages have the H1 "Kylttisi odottaa
  lahjoitustasi" and a question heading ("Mitä seuraavaksi?") for the AEO check. Personal pages
  pass `ogCard` to `PageLayout` to keep the generated card on a noindex page.
- **Checks:** `npm run check:adoption-pages` runs the personal page rule by hand.
- **Copy:** `src/content/signAdoption.ts`, `Record<Lang, …>`, including the confirmation email
  templates. Finnish is the source; sv/en are faithful translations. `SIGN_TEXT` is per locale:
  sv shows a Swedish sign ("Riksdagsvalet 2027 · Nyland", "Annonsens betalare: …"), en the
  Finnish one. Amounts in new strings keep a no-break space before "€".
- **Bindings:** D1 `DB`; secrets `TURNSTILE_SECRET`, `ADOPTIONS_TOKEN` (new) and `LIITY_STATS_TOKEN`.

### Submit

| Field | Rule |
|---|---|
| `lang` | `fi` · `sv` · `en` |
| `sign_name` | NFC-normalised, whitespace collapsed, 2–24 characters. Letters (`\p{L}`), space, hyphen, apostrophe (`'` `’`), period. Digits and `&` only when `company_name` is set. |
| `quantity` | integer 1–20; the "other number" chip posts `muu` with the stepper value in `quantity_other` |
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
  `consent_company_at`, `consent_version`. No IP, user agent or Turnstile token.

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
- `names`: approved rows with `public = 1`, newest approval first, at most 50; empty when fewer than 3.
- `messages`: `{name, message}` for approved, public rows with an approved message, at most 20.

Never an email, payer, company detail, ref or id.

### Owner flow

- `list`: pending rows and unmoderated messages.
- `approve <id|ref…> [--via mobilepay|lasku]`: after matching the MobilePay report by ref (or name,
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
  `kiitos`, `tack` or `thanks`; unique.
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

**Landing, first screen (mobile), in order:** eyebrow "Lauri Lavanti, Vihreiden
eduskuntavaaliehdokas Uudellamaalla" · H1 "Adoptoi kyltti. Nimesi nousee tienvarteen." · sign graphic
with Lauri's photo, ghost text "Sinun nimesi" and the "Mainoksen maksaja" line; fine print
"Havainnekuva. Lopullinen kyltti voi poiketa kuvasta." · "30 € = yksi kyltti tienvarteen" ·
"Nimi kylttiin" (maxlength 24, counter; the sign renders the typed value directly, no animation) ·
chips "1 kyltti · 30 €" (preselected), "2 kylttiä · 60 €", "5 kylttiä · 150 €", "Muu määrä kylttejä"
(stepper 1–20) → "Lahjoituksesi: 30 €" · always visible "Digitaalisen itsenäisyyden puolesta ry on
tukiyhdistykseni, joka järjestää vaalikeräyksen ja maksaa kyltit." + "Lue, miten kampanjani
rahoitetaan." (link to the campaign finance page) · CTA "Adoptoi kyltti" / "Adoptoi 2 kylttiä" ·
live line from `seina`: "Jo 14 kylttiä on adoptoitu." and "Viimeksi adoptoivat: A, B ja C." (each
only at ≥ 3).

**Below, in order:** intro → why → close + Liity → momentum (count, "Toivotut kunnat") → adopters
list (with the visitor's own pending tile "Nimi (odottaa vahvistusta)" from sessionStorage) →
"Näin lahjoitus toimii" → fallback + QR + Liity. Never seeded names.

- pageTitle "Adoptoi vaalikyltti, nimesi tienvarteen"
- description "Adoptoi vaalikyltti Uudellamaalla lahjoittamalla 30 euroa Lauri Lavannin kampanjalle.
  Kiitokseksi nimesi kirjoitetaan kylttiin, joka nousee tienvarteen."
- Intro "Adoptoi kyltti ja tue kampanjaani 30 eurolla. Se merkitsee minulle paljon. Kiitokseksi
  nimesi kirjoitetaan kyltin alareunaan, ja kyltti nousee keväällä tienvarteen Uudellamaalla."
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
- Visibility "Nimesi kirjoitetaan kyltin alareunaan, erilleen kampanjatekstistä. Nimesi näkyy
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
"Kylttisi: {nimi} · 2 kylttiä · 60 €") · "Missä kunnassa toivot kylttisi seisovan?" (hint "Otamme toiveen
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
"Seuraavaksi lahjoitat 30 € MobilePayllä ja saat viitekoodin, jonka kirjoitat viestiksi." (n × 30;
with a company name: "Seuraavaksi lähetämme 30 euron laskun antamaasi laskutusosoitteeseen.") ·
submit "Adoptoi kyltti" / "Adoptoi 2 kylttiä".

**Thanks** (URL carries only validated `?ref=K-\d{5}&n=1..20&y=0|1`), H1 "Kylttisi odottaa
lahjoitustasi", plate heading "Mitä seuraavaksi?", then in order:
1. The MobilePay block: heading "Melkein valmis: lahjoita 30 € MobilePayllä" (n × 30) · "Lahjoita
   30 euroa MobilePayllä numerolla 46492." · copy button · `/mp` button · QR on wide screens ·
   "Kirjoita viestiksi {ref}, niin löydämme lahjoituksesi." + copy · fallback "Eikö sinulla ole
   MobilePayta? Lahjoita kortilla tai verkkopankissa osoitteessa lavanti.fi/lahjoita ja lähetä
   viitekoodisi osoitteeseen lauri@lavanti.fi, niin yhdistämme lahjoituksen kylttiisi." · "Maksajan
   nimi, jos maksat toisen henkilön MobilePayllä" · "Lahjoitin".
   Company (`y=1`): no MobilePay block and no "Lahjoitin"; "Lähetämme laskun antamaasi
   laskutusosoitteeseen. Laskussa ei ole arvonlisäveroa, koska kyse on lahjoituksesta." Invoice
   title "Lahjoitus vaalikeräykseen (Adoptoi kyltti)".
2. Their sign from sessionStorage; when missing, the "Nimi kylttiin" field again.
3. "Liity mukaan: lavanti.fi/liity", visible from the start.
4. "Lahjoitin" → thank-you message, then share:
   > Kiitos, että lähdit tukemaan eduskuntavaalikampanjaani!
   >
   > Lahjoituksesi avulla kylttisi nousee keväällä tienvarteen, ja eduskunta on piirun verran lähempänä.
   >
   > Kun talous, sivistys ja vapaus toimivat yhdessä tekoälyn aikakaudella, rakennetaan digitaalisesti itsenäinen Suomi.
   >
   > Sinä teet sen mahdolliseksi. Kiitos!

   + "Tarkistamme lahjoituksen ja lähetämme vahvistuksen sähköpostiisi."
   - Share PNGs: story 1080×1920 and feed 1080×1350, drawn on canvas after `FontFace` loads Big
     Shoulders (latin + latin-ext). Chrome: wordmark + Vihreät logo on a top row, 76 px side
     padding, `lavanti.fi` visible, one stripe run at the foot; deep forest ground, never dark green
     text or rules on it. Text "Adoptoin Lauri Lavannin vaalikyltin" + their sign + "Adoptoi
     sinäkin: lavanti.fi/adoptoi". Shown as `<img>` ("Paina kuvaa pitkään ja tallenna se.") plus
     `navigator.share({files})` or download where supported; Instagram/Facebook in-app browsers get
     an "Avaa selaimessa" hint.
   - On share the UTM URL goes to the clipboard: "Lisää tarinaan linkkitarra. Osoite on jo
     leikepöydällä."
   - Share text "Adoptoin Lauri Lavannin vaalikyltin, ja keväällä se nousee tienvarteen minun
     nimelläni. Lauri on Vihreiden eduskuntavaaliehdokas Uudellamaalla. Adoptoi sinäkin:
     lavanti.fi/adoptoi"
5. Optional "Miksi adoptoin?" (≤ 140) → `viesti`; public only after moderation and opt-in.

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
    Given a sign name with digits and no company, a quantity of 21, a bad Y-tunnus or a missing consent
    When it is POSTed
    Then the response carries a fixed error code and nothing is stored

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
    Then the "Nimi kylttiin" field shows instead of a broken sign and the amount reads 60 euros

  Scenario: Invalid thanks parameters
    Given ?ref=<script>&n=99
    When the thanks page loads
    Then no ref or amount is rendered and the page links back to the form

  Scenario: Personal page commit isolation
    Given a staged change to src/content/adoptionPages.json together with any other path, or changing two entries
    When the commit runs
    Then scripts/checks/adoption-pages.ts fails it
```

### Definition of Done
- [ ] Landing, thanks and personal routes build for fi/sv/en; thanks and personal pages are noindex
  and absent from the sitemap; thanks paths send `X-Robots-Tag: noindex`.
- [ ] Unit tests cover the parser, every handler, the share-image layout and the CLI helpers;
  coverage of the new `src/lib` files ≥ 80 %.
- [ ] Privacy notice (fi/sv/en) has the section, with `updatedDate` bumped.
- [ ] E2E covers the steps, preview, chip → CTA label, thanks parameter validation, empty
  sessionStorage on thanks, and a mocked `seina`.

---

## Data Model

`migrations/0004_sign_adoptions.sql`, table `sign_adoptions`: `id` INTEGER PK, `created_at`,
`status` (`pending` · `approved` · `rejected`), `lang`, `sign_name`, `quantity`, `municipality`,
`email`, `payer_name?`, `company_name?`, `business_id?`, `billing_address?`, `public` (0/1),
`message?`, `message_at?`, `message_approved_at?`, `ref_code` UNIQUE, `edit_token_hash`,
`consent_print_at`, `consent_public_at?`, `consent_page_at?`, `consent_company_at?`,
`consent_version`, `utm_source?`, `utm_campaign?`, `approved_at?`, `paid_via?`, `printed_at?`.

```typescript
interface AdoptionPage {
    slug: string // [a-z0-9-]+, unique, not kiitos/tack/thanks
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

- **Do not** put the edit token, sign name or email in a URL. The thanks URL carries ref, n and y only.
- **Do not** use purchase vocabulary in any locale, or mention refunds.
- **Do not** seed the adopters list or momentum with example names or counts.
- **Do not** show a count, municipality cell or name list below the suppression threshold of 3.
- **Do not** add a `/fi/adoptoi/*` header or sitemap rule that would also noindex the landing page.
- **Do not** mix an `adoptionPages.json` change with any other path in one commit.
- **Do not** write user input into the page with `innerHTML`; use `textContent`.

---

## Open Questions

- [ ] Phase B: `ADOPTION_CLOSES`, the date in the intro, the municipality list narrowed to the
  placement plan and the name length from the printer's quote (raise only, never lower).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-11-14 | Initial spec |
| 2026-11-14 | Synced with the implementation: quantity_other, client script pattern, H1/eyebrow layout, ogCard, check script |
| 2026-11-14 | Donor review: direct-ask intro, association line under the total, next-step line and amount in the pinned summary, thanks page pays first with a no-MobilePay fallback, compact phone first screen, Swedish sign on sv, plain-language page consent, copy fixes |
