/* zBuyer Pulse Path lead API client (legacy.zbuyer.com/lr/AjaxServer.aspx).
 *
 * Lifecycle (per the API docs):
 *   1. InitNewLead on page load (srcURL = full page URL, carrying mid/affid
 *      attribution) -> submissionID, valid ~30 min from latest interaction.
 *   2. SaveLeadData per field (on blur/select, never per keystroke) with an
 *      incrementing cnt for request sync -> partial leads.
 *   3. GetContactOptInNames ONCE per session — results differ per call, so
 *      they are cached and reused (contact form + thank-you page).
 *   4. FinalizeLead POST with all fields -> raw pixel-tracking HTML, injected
 *      into the report page body (stashed in sessionStorage across the
 *      navigation).
 *
 * Observed behavior vs docs: a dead/unknown submissionID returns HTTP 403
 * (docs say 400) — both trigger re-init + replay of the field snapshot.
 * Real GetContactOptInNames responses carry an undocumented
 * showOnMeetTheExpertsPage flag per contact.
 *
 * Everything is UX-non-blocking: failures log and the funnel proceeds.
 * All state lives in sessionStorage (per-tab ≈ per user session; survives
 * the funnel -> report navigation).
 */
(function () {
  var BASE = window.PULSE_API_BASE;
  if (!BASE) return; // page not wired for the API; callers guard on window.PulseAPI

  // ---- field-name mapping (CANONICAL list from Lucas, 2026-07-06) ----
  var F = {
    // page-load echoes of the raw URL params ("null" placeholders are the
    // legacy convention for missing address parts)
    qsAddress: "queryStringAddress",
    qsCity: "queryStringAddressCity",
    qsState: "queryStringAddressState",
    qsZip: "queryStringAddressZipCode",
    qsFirstName: "queryStringFirstName",
    qsLastName: "queryStringLastName",
    qsAddressSuccess: "queryStringAddressSuccess", // "true" when Smarty/Google resolved it
    // resolved address (canonical components, not the raw URL values)
    street: "StreetAddress",
    city: "City",
    state: "State",
    zip: "Zip",
    // contact
    name: "name",
    phone: "phone",   // digits only, e.g. 7046927823
    email: "email",
    credit: "credit", // from zcredit; often missing
    // funnel lifecycle flags
    addressSubmitClicked: "AddressSubmitClicked", // hero CTA clicked
    contactFormDisplayed: "ContactFormDisplayed",
    contactOptInNames: "contactOptInNames",       // JSON of the contact list shown
    contactOptInNamesRender: "contactOptInNames_renderAsCheckboxes", // "True"/"False"
    contactFormSubmit: "ContactFormSubmit",
    tcpaTerms: "trustedform.com_TCPATerms",       // the disclosure+consent text displayed
    tfCertURL: "trustedform.com_CertURL",         // BARE TrustedForm cert token (server rebuilds the cert URL to claim)
    optInContact: "OptInContactID",               // one save per opted-in contact
    listedQuestion: "ListedQuestion",             // from OnboardAPI later; defaults "No"
    realtorOpt: "RealtorOpt",                     // "ok" on the all-set step's CTA
    dnc: "DNC",                                   // "true" on "Do not contact me" (no RealtorOpt then)
    smsOptIn: "SMSOptIn",                         // "true"/"false" from the Access-anytime step
    sellingTimeFrame: "SellingTimeFrame",         // the chip text: Now / Soon / Eventually / No
    whySelling: "WhySelling",                     // report-focus chip text: Fast cash / Both / Top price
    repairsNeeded: "RepairsNeeded",               // repairs-slider label; NOT canonical yet — confirm name
    somethingSpecial: "SomethingSpecial",         // free-text notes step (optional)
  };

  var K = {
    sid: "pulseSID",
    cnt: "pulseCNT",
    snap: "pulseFields",
    pixel: "pulsePixelHTML",
    contacts: "pulseContacts",
  };

  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  var sid = sget(K.sid) || "";
  var snapshot = {};
  try { snapshot = JSON.parse(sget(K.snap) || "{}"); } catch (e) {}
  var initing = null;     // in-flight InitNewLead promise
  var replaying = false;  // guard: one snapshot replay at a time
  var replayCount = 0;    // hard stop against re-init loops

  function nextCnt() {
    var c = parseInt(sget(K.cnt) || "0", 10) + 1;
    sset(K.cnt, String(c));
    return c;
  }

  function init(force) {
    if (sid && !force) return Promise.resolve(sid);
    if (initing) return initing;
    initing = fetch(BASE + "?function=InitNewLead&srcURL=" + encodeURIComponent(window.location.href))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        initing = null;
        if (!d.submissionID) return Promise.reject("no submissionID");
        sid = d.submissionID;
        sset(K.sid, sid);
        sset(K.cnt, "0");
        return sid;
      })
      .catch(function (err) {
        initing = null;
        console.warn("[Pulse] InitNewLead failed:", err);
        return "";
      });
    return initing;
  }

  // Dead submissionID (~30 min idle): re-init and replay every field captured
  // so far so the new partial lead is complete. Capped to avoid loops if the
  // server keeps rejecting.
  function reinitAndReplay() {
    if (replaying || replayCount >= 3) return;
    replaying = true;
    replayCount++;
    sid = "";
    init(true).then(function (newSid) {
      replaying = false;
      if (!newSid) return;
      Object.keys(snapshot).forEach(function (fld) {
        if (fld === F.optInContact) {
          [].concat(snapshot[fld]).forEach(function (v) { sendSave(fld, v); });
        } else {
          sendSave(fld, snapshot[fld]);
        }
      });
    });
  }

  function sendSave(fld, val) {
    return fetch(BASE + "?function=SaveLeadData&submissionID=" + encodeURIComponent(sid) +
        "&cnt=" + nextCnt() +
        "&fld=" + encodeURIComponent(fld) +
        "&val=" + encodeURIComponent(val))
      .then(function (r) {
        if (r.status === 400 || r.status === 403) reinitAndReplay();
        return r;
      })
      .catch(function (err) { console.warn("[Pulse] SaveLeadData failed:", fld, err); });
  }

  // Public save: records into the snapshot (for replay + finalize), then
  // sends once a submissionID exists. OptInContactID accumulates (a lead can
  // opt into several contacts); every other field keeps latest-value-wins.
  function save(fld, val) {
    if (val === undefined || val === null || val === "") return;
    if (fld === F.optInContact) {
      var list = [].concat(snapshot[fld] || []);
      if (list.indexOf(val) !== -1) return; // already saved this contact
      list.push(val);
      snapshot[fld] = list;
    } else {
      if (snapshot[fld] === val) return; // unchanged — don't resend
      snapshot[fld] = val;
    }
    sset(K.snap, JSON.stringify(snapshot));
    init().then(function (s) { if (s) sendSave(fld, val); });
  }

  // Final POST with every collected field. Resolves with the raw pixel HTML
  // (also stashed in sessionStorage for the report page). Never rejects, and
  // callers should race it against a short timeout before navigating.
  function finalize(extra) {
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] !== undefined && extra[k] !== null && extra[k] !== "") snapshot[k] = extra[k];
    });
    sset(K.snap, JSON.stringify(snapshot));
    return init().then(function (s) {
      if (!s) return "";
      var body = Object.keys(snapshot).map(function (k) {
        return [].concat(snapshot[k]).map(function (v) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(v);
        }).join("&");
      }).join("&");
      return fetch(BASE + "?function=FinalizeLead&submissionID=" + encodeURIComponent(s), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (html) { sset(K.pixel, html); return html; })
        .catch(function (err) { console.warn("[Pulse] FinalizeLead failed:", err); return ""; });
    });
  }

  // ONCE per session (docs: results differ per call; the same set must be
  // reused on the contact form and the thank-you page) — cached in
  // sessionStorage. Kept across a re-init: the user already saw these names.
  function getOptInContacts() {
    var cached = sget(K.contacts);
    if (cached) {
      try { return Promise.resolve(JSON.parse(cached)); } catch (e) {}
    }
    return init().then(function (s) {
      if (!s) return null;
      return fetch(BASE + "?function=GetContactOptInNames&submissionID=" + encodeURIComponent(s))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) { sset(K.contacts, JSON.stringify(d)); return d; })
        .catch(function (err) { console.warn("[Pulse] GetContactOptInNames failed:", err); return null; });
    });
  }

  // ---- Onboard proxy helpers (report-page phase; here for completeness) ----
  // Double-encoding rule: encode individual values, build the full onboard
  // URL, then encode that entire string into req=.
  function onboard(reqURL) {
    return init().then(function (s) {
      if (!s) return null;
      return fetch(BASE + "?function=OnboardAPI&submissionID=" + encodeURIComponent(s) +
          "&req=" + encodeURIComponent(reqURL))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .catch(function (err) { console.warn("[Pulse] OnboardAPI failed:", err); return null; });
    });
  }
  function avmDetail(address1, address2) {
    return onboard("https://search.onboard-apis.com/propertyapi/v1.0.0/avm/detail" +
      "?address1=" + encodeURIComponent(address1) +
      "&address2=" + encodeURIComponent(address2));
  }
  function getReport(type) { // "avm_detail" | "sale_snapshot"
    return init().then(function (s) {
      if (!s) return null;
      return fetch(BASE + "?function=OnboardReport&submissionID=" + encodeURIComponent(s) +
          "&type=" + encodeURIComponent(type))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .catch(function (err) { console.warn("[Pulse] OnboardReport failed:", err); return null; });
    });
  }

  window.PulseAPI = {
    F: F,
    init: init,
    save: save,
    finalize: finalize,
    getOptInContacts: getOptInContacts,
    avmDetail: avmDetail,
    getReport: getReport,
  };

  init(); // docs step 1: call on page load

  // ---- page-load echoes of the raw URL params ----
  // The canonical lead record keeps what the link *claimed* (queryString*)
  // separate from what resolution *verified* (StreetAddress/City/State/Zip,
  // saved by the prepop chain in address-autocomplete.js). Missing address
  // parts use the literal "null" per the legacy convention.
  (function () {
    var qp = new URLSearchParams(window.location.search);
    var g = function (k) { return (qp.get(k) || "").trim(); };
    var street = g("zstreet"), city = g("zcity"), state = g("zstate"), zip = g("zzipcode");
    if (street || city || state || zip) {
      var nv = function (v) { return v || "null"; };
      save(F.qsAddress, nv(street) + " " + nv(city) + " " + nv(state) + " " + nv(zip));
      save(F.qsCity, nv(city));
      save(F.qsState, nv(state));
      save(F.qsZip, nv(zip));
    }
    if (g("zfname")) save(F.qsFirstName, g("zfname"));
    if (g("zlastname")) save(F.qsLastName, g("zlastname"));
    if (g("zcredit")) save(F.credit, g("zcredit"));
  })();
})();
