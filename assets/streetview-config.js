/* Google Street View Static API — browser (website) key.
 *
 * Used by streetview-bg.js on the DR lander to show the pre-popped address's
 * actual street view photo as the hero background.
 *
 * 1. In Google Cloud console (console.cloud.google.com):
 *      - Enable "Street View Static API" on the project.
 *      - Create an API key.
 * 2. Restrict the key (Credentials → your key):
 *      - Application restriction: Websites (HTTP referrers) —
 *            https://ledwards-zbuyer.github.io/*
 *            http://localhost:8741/*
 *            https://zbuyer.com/*  and  https://www.zbuyer.com/*
 *      - API restriction: Street View Static API only.
 * 3. Paste the key below.
 *
 * Same trust model as the Smarty embedded key: the key ships in page source,
 * but it is referrer-locked and can only call Street View, so it cannot be
 * abused if copied.
 *
 * Cost note: image renders bill ~$7 per 1,000; the free metadata check in
 * streetview-bg.js gates every render, so addresses without imagery cost $0.
 */
window.GMAPS_STREETVIEW_KEY = "PASTE_GOOGLE_KEY_HERE";
