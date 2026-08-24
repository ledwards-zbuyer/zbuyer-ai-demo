/* Google Maps Platform — browser (website) key.
 *
 * Used by address-autocomplete.js as the geocoding fallback when Smarty
 * can't resolve a pre-populated (z-param) address; the Maps JS SDK is
 * lazy-loaded only in that case. Can later also serve Street View (enable
 * that API on the same key and point streetview-config.js at it).
 *
 * Setup — RESTRICT BEFORE FIRST USE (lesson learned 2026-07-02):
 * 1. console.cloud.google.com → enable "Maps JavaScript API" AND
 *    "Geocoding API" on the project; create an API key.
 * 2. Restrict the key BEFORE pasting it here:
 *      - Application restriction: Websites (HTTP referrers) —
 *            https://ledwards-zbuyer.github.io/*
 *            http://localhost:8741/*
 *      - API restriction: Maps JavaScript API + Geocoding API only.
 * 3. Paste the key below. Referrer-locked keys are safe in page source.
 *
 * Until a key is pasted, the prepop chain simply skips the Google stage
 * (logged as SKIP) — Smarty's filter-parameter usage already resolves most
 * partial addresses. Geocoding bills ~$5 per 1,000 calls, charged only when
 * Smarty misses twice.
 */
window.GOOGLE_MAPS_KEY = "AIzaSyBBJPyttL0npyhmgAuKAoUrTBR5ffecnOs";
