# zbuyer-ai-demo

zBuyer-branded home-seller path implementing the **"bare minimum" opt-in spec**
(zbuyer.ai, 2026-08-24) — the original screens plus exactly three consent edits.
Destined for **zBuyer.ai**; shared here for team review via GitHub Pages.

## The three edits (and the two footnote behaviors)

1. **Screen 1 — "zBuyer and" deleted** from the inline checkbox consent: the member
   alone is named (demo persona: Jason Dalbey, BHHS The Preferred Realty). The only
   zBuyer SMS consent anywhere on the site is Screen 2. The box is **optional** —
   Continue proceeds unchecked.
2. **Screen 2 — the no-share declaration added**: "Your mobile number and opt-in data
   are never sold or shared with third parties or affiliates for marketing."
3. **Screen 2 — Terms & Privacy linked at the point of opt-in.**

Per the spec's footnotes: the privacy policy carries the **matching never-sold-or-shared
carve-out** for SMS opt-in data, and the all-set screen **names the member truthfully
and only when the box was checked** (unchecked → "no one will reach out unless you ask").
Everything else keeps the original pixels: "local expert knowledge" sub, the legal-wall
consent paragraph, "Access your report anytime" + clock + "Check anytime. We'll text the
link.", "Send my Report →", "No thanks, don't send my report", no first-text preview.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage front door: address hero + funnel modal (**live** Pulse API) |
| `go.html` | DR lander (locked modal, same funnel) |
| `report.html` | Cash Value Report — greets with the seller's real address; stats stay demo |
| `terms.html` / `privacy.html` | zBuyer legal template pages (privacy carries the SMS carve-out) |
| `do-not-sell.html` | CCPA form → `SaveLeadData` `fld=DNSell&val=1` |
| `shots/harness.html` | QA step-driver |

## ⚠️ Live API

`InitNewLead` fires on every page load; `FinalizeLead` on the all-set CTA. **Test URLs
must carry `?mid=56&affid=testing`.** The displayed member is pinned to the demo persona
(`DEMO_PINNED_MEMBER` in `assets/lead-modal.js`); no `OptInContactID` is recorded.

## Keys

`assets/smarty-config.js` and `assets/google-config.js` carry the original zBuyer keys,
whose allow-lists include `ledwards-zbuyer.github.io` — so autocomplete and the geocode
fallback work on the Pages URL. (Street View on the report masthead stays on its stock
photo here; that API isn't enabled on this key.)

## Params

`?sms=0` (skip the text step) · `?dnc=0` (hide "Do not contact me") · z-params prefill ·
`report.html?debug=1` session dump · harness `?step=contact|err|questions|spdrag|textreport|allset|dnc|ac`

## Serve

GitHub Pages: Settings → Pages → Deploy from branch `main` / `(root)` →
`https://ledwards-zbuyer.github.io/zbuyer-ai-demo/`. Local: `python -m http.server 8741`.

## Caveats

Consent/legal copy is placeholder pending final legal language; `terms.html` /
`privacy.html` are template pages; `robots.txt` disallows crawling and every page is
`noindex` (demo posture).
