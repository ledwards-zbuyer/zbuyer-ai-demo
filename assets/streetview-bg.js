/* zBuyer DR lander — Street View hero background for pre-popped addresses.
 *
 * When the page is opened through a paid-traffic link carrying z-params
 * (zstreet/zcity/zstate/zzipcode), swap the hero's stock house photo for the
 * Google Street View image of that address. A free metadata call gates the
 * (billable) image render: no imagery → the default background stays and
 * Google's gray "no imagery" placeholder is never shown.
 *
 * Requires window.GMAPS_STREETVIEW_KEY from streetview-config.js.
 */
(function () {
  var IMG_ENDPOINT = "https://maps.googleapis.com/maps/api/streetview";
  var META_ENDPOINT = "https://maps.googleapis.com/maps/api/streetview/metadata";

  var bg = document.querySelector(".hero .bgimg");
  if (!bg) return;

  var key = window.GMAPS_STREETVIEW_KEY;
  if (!key || key.indexOf("PASTE_") === 0) return;

  var qp = new URLSearchParams(window.location.search);
  var zstreet = (qp.get("zstreet") || "").trim();
  if (!zstreet) return;

  var addr = [zstreet, (qp.get("zcity") || "").trim(), (qp.get("zstate") || "").trim(),
    (qp.get("zzipcode") || "").trim()].join(" ").replace(/\s+/g, " ").trim();
  // radius=100 (default 50m): geocodes land on the rooftop, and on deep lots
  // the nearest panorama sits farther away than 50m — e.g. 1336 E Walnut St
  // Springfield MO returned ZERO_RESULTS until widened. 100m stays close
  // enough that the auto-aimed camera can't land on the wrong street.
  var params = "location=" + encodeURIComponent(addr) + "&source=outdoor&radius=100&key=" + encodeURIComponent(key);

  fetch(META_ENDPOINT + "?" + params)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (meta) {
      if (meta.status !== "OK") return; // no imagery for this address — keep the default photo
      // Same three layers as the stylesheet (index.html .bgimg):
      // dark legibility gradient on top, navy base underneath — only the photo
      // in the middle changes.
      bg.style.backgroundImage =
        "linear-gradient(180deg,rgba(10,18,33,.72),rgba(13,27,51,.45) 38%,rgba(8,14,26,.86))," +
        "url('" + IMG_ENDPOINT + "?size=640x640&fov=80&" + params + "')," +
        "linear-gradient(135deg,#13294f,#0a1426)";
    })
    .catch(function (err) { console.warn("[StreetView] metadata lookup failed:", err); });
})();
