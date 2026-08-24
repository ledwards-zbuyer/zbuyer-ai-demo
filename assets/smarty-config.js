/* Smarty US Autocomplete Pro — embedded (website) key.
 *
 * IMPORTANT: Browser address autocomplete REQUIRES an embedded key.
 * Your Smarty Auth ID / Auth Token are *secret* (server-side) keys and are
 * rejected when called from a browser — so they cannot be used here.
 *
 * 1. Generate an embedded key:  https://www.smarty.com/account/keys
 * 2. On that key, authorize these hosts (Referer/host allow-list):
 *        localhost, 127.0.0.1          → local testing via a web server
 *        ledwards-zbuyer.github.io     → this demo's GitHub Pages host
 *        zbuyer.com, www.zbuyer.com    → production
 * 3. Paste the embedded key below.
 *
 * This file MUST be committed/pushed for the live site to work. That is safe-
 * by-design: the key only works from the hosts you authorized above, so it
 * cannot be abused if someone copies it from the page source.
 */
window.SMARTY_EMBEDDED_KEY = "7143628601098866";
