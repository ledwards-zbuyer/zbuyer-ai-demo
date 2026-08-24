/* Pulse Path lead API — configuration.
 *
 * Including this file (plus pulse-api.js) on a page IS the enable switch:
 * pages without these scripts (homepage, compare tools) stay inert demos.
 * Currently enabled on: index.html (the lander) only.
 *
 * Endpoint is zBuyer's internal AjaxServer (IIS/ASP.NET). CORS is open
 * (Access-Control-Allow-Origin: *) and no client secret is involved — the
 * Onboard apikey lives behind zBuyer's proxy. Safe to ship in page source.
 *
 * TESTING: submissions are attributed via the page URL that InitNewLead
 * receives (srcURL). Test links must carry  ?mid=56&affid=testing  so test
 * leads are marked as such — the client sends location.href automatically.
 */
window.PULSE_API_BASE = "https://legacy.zbuyer.com/lr/AjaxServer.aspx";
