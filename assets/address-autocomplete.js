/* zBuyer address autocomplete — Smarty US Autocomplete Pro (client-side).
 *
 * Attaches to the hero address input (#addr) and renders a suggestion
 * dropdown (#addr-suggestions). Requires window.SMARTY_EMBEDDED_KEY from
 * smarty-config.js. Vanilla JS, no dependencies.
 */
(function () {
  var ENDPOINT = "https://us-autocomplete-pro.api.smarty.com/lookup";
  var input = document.getElementById("addr");
  var list = document.getElementById("addr-suggestions");
  if (!input || !list) return;

  var items = [];      // current suggestion objects from Smarty
  var active = -1;     // index of keyboard-highlighted item
  var debounce;        // debounce timer handle
  var seq = 0;         // request sequence guard against out-of-order responses

  function keyMissing() {
    var k = window.SMARTY_EMBEDDED_KEY;
    return !k || k.indexOf("PASTE_") === 0;
  }

  // Build the `selected` value Smarty expects to expand a multi-unit address.
  function selectedString(s) {
    return s.street_line +
      (s.secondary ? " " + s.secondary : "") +
      " (" + s.entries + ") " + s.city + " " + s.state + " " + s.zipcode;
  }

  // Full one-line address used to fill the input on final selection.
  function fullAddress(s) {
    return s.street_line +
      (s.secondary ? " " + s.secondary : "") +
      ", " + s.city + ", " + s.state + " " + s.zipcode;
  }

  // Post-selection display chip: street prominent, city/state/zip minimized
  // (mirrors the suggestion list). Clicking it restores the input to edit.
  var picked = null;
  function showPicked(street, sec) {
    if (!picked) {
      picked = document.createElement("div");
      picked.className = "picked";
      picked.innerHTML = '<span class="p-street"></span><span class="p-sec"></span>';
      picked.addEventListener("click", function () {
        picked.hidden = true;
        input.classList.remove("hidden-by-pick");
        var box = input.closest(".search");
        if (box) box.classList.remove("has-pick");
        input.focus();
        syncClear();
      });
      input.parentNode.insertBefore(picked, input.nextSibling);
    }
    picked.children[0].textContent = street;
    picked.children[1].textContent = sec;
    picked.hidden = false;
    input.classList.add("hidden-by-pick");
    var box = input.closest(".search");
    if (box) box.classList.add("has-pick");
    // The report page reads this to show the submitted address.
    try { sessionStorage.setItem("zbAddressDisplay", street + ", " + sec); } catch (e) {}
    syncClear();
  }

  // Circled-X clear button: one tap wipes the address instead of backspacing.
  // Shown only while the real input is visible with content — never over the
  // picked chip (tapping the chip is already the edit affordance).
  var clearBtn = document.getElementById("addrClear");
  function syncClear() {
    if (!clearBtn) return;
    clearBtn.hidden = !input.value || input.classList.contains("hidden-by-pick");
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      input.value = "";
      window.zbSelectedAddress = null;
      hideStreetView();
      close();
      syncClear();
      input.focus();
    });
  }

  // ---- optional Street View preview (?zsv=1): shows above the address box
  // once an address is verified (manual pick or prepop). Free metadata call
  // gates the billable render; wide/short frame keeps the CTA near the fold.
  // Uses GOOGLE_MAPS_KEY (google-config.js) — Street View Static API must be
  // enabled on it. ----
  var SV_ON = /[?&]zsv=1(&|$|#)/.test(window.location.search + "&");
  var svImg = null;
  function hideStreetView() {
    if (svImg) {
      svImg.hidden = true;
      var b = input.closest(".search");
      if (b) b.classList.remove("has-sv");
    }
  }
  function maybeShowStreetView(addr) {
    if (!SV_ON) return;
    var key = window.GOOGLE_MAPS_KEY;
    if (!key || key.indexOf("PASTE_") === 0) return;
    var params = "location=" + encodeURIComponent(addr) + "&source=outdoor&radius=100&key=" + encodeURIComponent(key);
    fetch("https://maps.googleapis.com/maps/api/streetview/metadata?" + params)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (meta) {
        if (meta.status !== "OK") { console.info("[StreetView] preview skipped:", meta.status); return; }
        var box = input.closest(".search");
        if (!box) return;
        if (!svImg) {
          svImg = document.createElement("img");
          svImg.className = "sv-img";
          svImg.alt = "Street view of this address";
          box.insertBefore(svImg, box.firstChild);
        }
        // 640x400 source (not 640x200): the strip renders ~230px tall now and
        // a taller source keeps the cover-crop sharp with more of the house.
        svImg.src = "https://maps.googleapis.com/maps/api/streetview?size=640x400&fov=68&pitch=6&" + params;
        svImg.hidden = false;
        box.classList.add("has-sv");
      })
      .catch(function (err) { console.info("[StreetView] preview failed:", err); });
  }

  // Push the verified address into the Pulse lead API (no-op on pages that
  // don't load pulse-api.js — the homepage and compare tools stay inert).
  function pulseSaveAddress(s) {
    if (!window.PulseAPI) return;
    var F = window.PulseAPI.F;
    window.PulseAPI.save(F.street, s.street_line + (s.secondary ? " " + s.secondary : ""));
    window.PulseAPI.save(F.city, s.city);
    window.PulseAPI.save(F.state, s.state);
    window.PulseAPI.save(F.zip, s.zipcode);
  }

  function lookup(search, selected) {
    if (keyMissing()) {
      console.warn("[Smarty] No embedded key set in smarty-config.js — autocomplete disabled.");
      return;
    }
    var url = ENDPOINT +
      "?key=" + encodeURIComponent(window.SMARTY_EMBEDDED_KEY) +
      "&search=" + encodeURIComponent(search) +
      "&max_results=7";
    if (selected) url += "&selected=" + encodeURIComponent(selected);

    var mine = ++seq;
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (mine !== seq) return; // a newer request superseded this one
        render(data.suggestions || []);
      })
      .catch(function (err) { console.warn("[Smarty] lookup failed:", err); });
  }

  function render(suggestions) {
    items = suggestions;
    active = -1;
    if (!suggestions.length) { close(); return; }

    list.innerHTML = "";
    suggestions.forEach(function (s, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      var street = s.street_line + (s.secondary ? " " + s.secondary : "");
      if (s.entries > 1) street += " (" + s.entries + " more)";
      var tail = s.city + ", " + s.state + " " + s.zipcode;
      li.innerHTML = '<span class="ac-street"></span><span class="ac-sec"></span>';
      li.children[0].textContent = street;
      li.children[1].textContent = tail;
      li.addEventListener("mousedown", function (e) {
        e.preventDefault(); // keep focus in the input
        choose(i);
      });
      list.appendChild(li);
    });
    open();
  }

  function choose(i) {
    var s = items[i];
    if (!s) return;
    if (s.entries > 1) {
      // Expand the building into its individual units.
      lookup(input.value, selectedString(s));
    } else {
      input.value = fullAddress(s);
      window.zbSelectedAddress = s; // expose structured pick for the lead modal
      showPicked(s.street_line + (s.secondary ? " " + s.secondary : ""), s.city + ", " + s.state + " " + s.zipcode);
      maybeShowStreetView(fullAddress(s));
      pulseSaveAddress(s);
      close();
      input.blur(); // dismiss the mobile keyboard once an address is chosen
      // Reverse the focus scroll so the CTA lands by the thumb. Runs twice:
      // once right away, once after the keyboard finishes closing (the
      // viewport resize changes innerHeight under us).
      setTimeout(scrollSearchToBottom, 120);
      setTimeout(scrollSearchToBottom, 450);
    }
  }

  function highlight(next) {
    var nodes = list.children;
    if (!nodes.length) return;
    active = (next + nodes.length) % nodes.length;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("active", i === active);
    }
  }

  function open() { list.hidden = false; input.setAttribute("aria-expanded", "true"); }
  function close() { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); }

  // On phones the keyboard leaves room for barely one suggestion below the
  // mid-hero search box. On focus, scroll the box to the top of the page so
  // the list gets the space instead. Runs twice: once right after the
  // browser's own scroll-into-view jump, once after the keyboard settles
  // (opening it resizes the viewport and can undo the first scroll).
  var searchBox = input.closest(".search") || input;
  // Instant jump: the page sets html{scroll-behavior:smooth}, which would
  // animate these scrolls and lose the race against the keyboard
  // opening/closing and resizing the viewport.
  function jump(y) {
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.max(0, y));
    root.style.scrollBehavior = prev;
  }
  function scrollSearchToTop() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    jump(searchBox.getBoundingClientRect().top + window.pageYOffset - 10);
  }
  // Reverse of scrollSearchToTop: once an address is picked and the
  // keyboard dismissed, align the search box's bottom (the CTA button on
  // mobile) near the bottom of the viewport for an easy thumb tap.
  function scrollSearchToBottom() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    var r = searchBox.getBoundingClientRect();
    jump(r.bottom + window.pageYOffset - window.innerHeight + 14);
  }
  input.addEventListener("focus", function () {
    setTimeout(scrollSearchToTop, 60);
    setTimeout(scrollSearchToTop, 350);
  });

  input.addEventListener("input", function () {
    window.zbSelectedAddress = null; // typing invalidates the last structured pick
    hideStreetView(); // stale photo for whatever they type next
    syncClear();
    var q = input.value.trim();
    clearTimeout(debounce);
    if (q.length < 3) { close(); return; }
    debounce = setTimeout(function () { lookup(q); }, 150);
  });

  input.addEventListener("keydown", function (e) {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter") {
      if (active >= 0) { e.preventDefault(); choose(active); }
    } else if (e.key === "Escape") { close(); }
  });

  document.addEventListener("click", function (e) {
    if (!list.contains(e.target) && e.target !== input) close();
  });

  // ---- z-param address prefill (email/SMS landing links) ----
  // zstreet/zcity/zstate/zzipcode arrive on paid-traffic links, often partial
  // or dirty (missing city/zip, wrong zip). The box shows the composed string
  // instantly, then a silent resolution chain upgrades it:
  //   S1  Smarty: search = street (+city), state via include_only_states.
  //       Filters, NOT search text — state/zip inside the search text is what
  //       made Smarty miss partial addresses on the prior funnel. Zips are
  //       never sent at all: they lie, and Smarty supplies the canonical one.
  //   S2  Smarty: street only + state filter (the city may be the dirty part).
  //   G   Google geocode — Maps JS SDK lazy-loaded only when Smarty missed
  //       and a key is configured (google-config.js). Google is better at
  //       partial/garbled addresses.
  //   S3  Smarty again, rebuilt from Google's address components.
  // Smarty success at any stage = canonical address + zbSelectedAddress +
  // Pulse saves, identical to a manual pick. Google-only success still fills
  // the box and saves Google's components. Total failure keeps the composed
  // string. Each attempt logs one [Prepop] line in the prior funnel's QA
  // format (Source / Result / Reason / Input / Output).
  var qp = new URLSearchParams(window.location.search);
  var zstreet = (qp.get("zstreet") || "").trim();
  if (zstreet) {
    var zcity = (qp.get("zcity") || "").trim();
    var zstate = (qp.get("zstate") || "").trim();
    var zzip = (qp.get("zzipcode") || "").trim();
    var composed = zstreet + (zcity ? ", " + zcity : "") + (zstate ? ", " + zstate : "") + (zzip ? " " + zzip : "");
    input.value = composed;
    syncClear();

    var plog = function (source, result, reason, inp, out) {
      console.info("[Prepop] Source: " + source + ", Result: " + result +
        ", Reason: " + reason + ", Input: " + inp + ", Output: " + (out || "undefined"));
    };

    var smartyTry = function (search, state, reason) {
      if (keyMissing()) return Promise.resolve(null);
      var logInput = search + (state ? " [" + state + "]" : "");
      var url = ENDPOINT +
        "?key=" + encodeURIComponent(window.SMARTY_EMBEDDED_KEY) +
        "&search=" + encodeURIComponent(search) +
        (state ? "&include_only_states=" + encodeURIComponent(state) : "") +
        "&max_results=1";
      return fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
          var s = (data.suggestions || [])[0];
          if (s && !(s.entries > 1)) { // multi-unit umbrellas stay skipped
            plog("Smarty", "SUCCESS", reason, logInput, fullAddress(s));
            return s;
          }
          plog("Smarty", "FAIL", reason, logInput, null);
          return null;
        })
        .catch(function (err) { plog("Smarty", "FAIL", reason + " (error " + err + ")", logInput, null); return null; });
    };

    var googleGeocode = function () {
      var key = window.GOOGLE_MAPS_KEY;
      if (!key || key.indexOf("PASTE_") === 0) {
        plog("Google", "SKIP", "No Google Maps key configured (google-config.js)", composed, null);
        return Promise.resolve(null);
      }
      return new Promise(function (resolve) {
        var run = function () {
          new window.google.maps.Geocoder().geocode(
            { address: composed, componentRestrictions: { country: "US" } },
            function (results, status) {
              var r = status === "OK" && results && results[0];
              // Granularity guard: Google fuzzy-matches garbage to towns and
              // bare roads. Only a street-level result (house number + street
              // name) is trustworthy enough to overwrite the user's address.
              var streetLevel = r && (r.address_components || []).some(function (c) { return c.types.indexOf("street_number") !== -1; })
                && (r.address_components || []).some(function (c) { return c.types.indexOf("route") !== -1; });
              if (streetLevel) plog("Google", "SUCCESS", "Geocoding address from URL", composed, r.formatted_address);
              else if (r) plog("Google", "FAIL", "Result not street-level, rejected", composed, r.formatted_address);
              else plog("Google", "FAIL", "Geocoder status " + status, composed, null);
              resolve(streetLevel ? r : null);
            });
        };
        if (window.google && window.google.maps && window.google.maps.Geocoder) { run(); return; }
        window.zbGeocoderReady = run;
        var sc = document.createElement("script");
        sc.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) +
          "&loading=async&callback=zbGeocoderReady";
        sc.onerror = function () { plog("Google", "FAIL", "Maps JS SDK failed to load", composed, null); resolve(null); };
        document.head.appendChild(sc);
      });
    };

    // Pull one component out of a Google geocoder result.
    var gPart = function (r, type, form) {
      var m = (r.address_components || []).filter(function (c) { return c.types.indexOf(type) !== -1; })[0];
      return m ? m[form || "long_name"] : "";
    };

    var apply = function (s) { // Smarty success — same effects as a manual pick
      input.value = fullAddress(s);
      window.zbSelectedAddress = s;
      showPicked(s.street_line + (s.secondary ? " " + s.secondary : ""), s.city + ", " + s.state + " " + s.zipcode);
      maybeShowStreetView(fullAddress(s));
      pulseSaveAddress(s);
      if (window.PulseAPI) window.PulseAPI.save(window.PulseAPI.F.qsAddressSuccess, "true");
    };

    // Unresolvable address: leave the box BLANK — a wrong/garbled prefill in
    // the box is worse than asking the user to type. (Lucas, 2026-07-06.)
    var giveUp = function () {
      input.value = "";
      syncClear();
      if (window.PulseAPI) window.PulseAPI.save(window.PulseAPI.F.qsAddressSuccess, "false");
    };

    smartyTry(zstreet + (zcity ? " " + zcity : ""), zstate, "Validating pre-populated address from URL")
      .then(function (s) {
        if (s || !zcity) return s; // S1 was already street-only when no city
        return smartyTry(zstreet, zstate, "Retry without city (city may be dirty)");
      })
      .then(function (s) {
        if (s) { apply(s); return; }
        return googleGeocode().then(function (g) {
          if (!g) { giveUp(); return; } // chain exhausted — blank box
          var gStreet = (gPart(g, "street_number") + " " + gPart(g, "route")).trim();
          var gCity = gPart(g, "locality") || gPart(g, "sublocality") || gPart(g, "postal_town");
          var gState = gPart(g, "administrative_area_level_1", "short_name");
          return smartyTry(gStreet + (gCity ? " " + gCity : ""), gState,
            "Fallback validation using Google formatted address")
            .then(function (s2) {
              if (s2) { apply(s2); return; }
              // Google-only outcome (street-level, guard-approved): fill the
              // box and save Google's components to Pulse.
              input.value = g.formatted_address.replace(/,\s*USA$/, "");
              showPicked(gStreet, (gCity ? gCity + ", " : "") + gState + (gPart(g, "postal_code") ? " " + gPart(g, "postal_code") : ""));
              maybeShowStreetView(g.formatted_address);
              if (window.PulseAPI) {
                var F = window.PulseAPI.F;
                var gZip = gPart(g, "postal_code");
                if (gStreet) window.PulseAPI.save(F.street, gStreet);
                if (gCity) window.PulseAPI.save(F.city, gCity);
                if (gState) window.PulseAPI.save(F.state, gState);
                if (gZip) window.PulseAPI.save(F.zip, gZip);
                window.PulseAPI.save(F.qsAddressSuccess, "true");
              }
            });
        });
      });
  }
})();
