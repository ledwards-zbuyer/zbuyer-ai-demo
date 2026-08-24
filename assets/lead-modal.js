/* zBuyer lead-capture modal — opens after the hero address step.
 *
 * Contact step: name / phone / email + the MINIMUM consent — an optional
 *   inline checkbox naming only the matched member (no zBuyer in it).
 * SMS step: zBuyer's own opt-in — "Access your report anytime" / Send my Report.
 * All-set: confirmation; the member is named only if consent was given.
 * The final buttons navigate to the demo report page. Vanilla JS, no deps.
 */
(function () {
  var modal = document.getElementById("leadModal");
  var heroForm = document.querySelector(".hero .search");
  var addr = document.getElementById("addr");
  if (!modal || !heroForm || !addr) return;

  var REPORT_PAGE = "report.html"; // demo Cash Value Report page

  // Back from the report restores this page from the back/forward cache
  // exactly as it was left — mid-finale, an empty stage dot. Reload instead
  // so the funnel restarts cleanly (the Pulse submissionID survives in
  // sessionStorage, so it's still the same lead session).
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) window.location.reload();
  });

  var card = modal.querySelector(".lm-card");
  var screens = modal.querySelectorAll(".lm-screen");
  var form = document.getElementById("leadForm");
  var errEl = document.getElementById("leadErr");
  var nameEl = form.querySelector('[name="name"]');
  var phoneEl = document.getElementById("leadPhone");
  var emailEl = form.querySelector('[name="email"]');

  // "Open to selling?" intent chips — one-word continuum, one tap to answer.
  var chipsWrap = document.getElementById("intentChips");
  var chips = chipsWrap.querySelectorAll(".lm-chip");
  var intentValue = "";

  var lastFocus = null;

  // Direct-response landing pages set <body data-dr>: the backdrop there has
  // no data-close (click-off can't dismiss), and the X / Escape only work on
  // the contact step — the one carrying the consent terms.
  var DR = document.body.hasAttribute("data-dr");
  var xBtn = modal.querySelector(".lm-x");
  var current = "";

  // ---- Pulse lead API (only on wired pages — pulse-api.js precedes us
  // there; the homepage/compare tools don't load it and stay inert) ----
  var P = window.PulseAPI || null;
  var optInData = null; // cached GetContactOptInNames response
  function psave(fld, val) { if (P && val) P.save(fld, val); }
  // Canonical phone format is digits only (e.g. 7046927823).
  function phoneDigits(v) {
    var d = v.replace(/\D/g, "").slice(0, 10);
    return d.length === 10 ? d : "";
  }
  // SellingTimeFrame carries the chip's visible text (Now/Soon/Eventually/No).
  var intentLabel = "";

  // ?sms=0|off|no|false skips the Access-anytime (SMS) step — the flow goes
  // notes -> all-set directly, as in the automatic-texting era. Default: shown.
  var SMS_STEP = !/[?&]sms=(0|off|no|false)\b/i.test(window.location.search);
  // ?dnc=0|off|no|false hides the all-set step's "Do not contact me" link.
  // Default: shown. remove(), not [hidden] — .lm-final .lm-nothanks sets
  // display:block, which would override the hidden attribute.
  if (/[?&]dnc=(0|off|no|false)\b/i.test(window.location.search)) {
    var ncLink = document.getElementById("noContact");
    if (ncLink) ncLink.remove();
  }

  // The optional member-consent checkbox (the minimum consent).
  var expertOpt = document.getElementById("expertOpt");
  var v2Box = document.getElementById("v2Consent");
  if (expertOpt && v2Box) {
    expertOpt.addEventListener("change", function () {
      v2Box.classList.toggle("checked", expertOpt.checked);
    });
    // Tap anywhere in the box (outside the label, which toggles natively)
    // also flips the check — same ergonomics as the v1 inline variant.
    v2Box.addEventListener("click", function (e) {
      if (e.target.closest(".lm-v2-row, a, .lm-check")) return;
      expertOpt.checked = !expertOpt.checked;
      v2Box.classList.toggle("checked", expertOpt.checked);
    });
  }

  // Legal rail below the fold: "Step x of N" + dots (N = dot count in the
  // markup). The zbeat interstitial isn't a step — it keeps the previous
  // reading.
  var STEP_NUM = SMS_STEP
    ? { contact: 1, questions: 2, special: 3, textreport: 4, allset: 5 }
    : { contact: 1, questions: 2, special: 3, allset: 4 };
  var progText = modal.querySelector(".lm-prog-text");
  var progDots = modal.querySelectorAll(".lm-prog-dot");
  if (!SMS_STEP && progDots.length) {
    progDots[progDots.length - 1].remove(); // the rail counts 4 steps now
    progDots = modal.querySelectorAll(".lm-prog-dot");
  }
  function show(name) {
    current = name;
    screens.forEach(function (s) { s.hidden = s.getAttribute("data-screen") !== name; });
    if (DR && xBtn) xBtn.hidden = name !== "contact";
    var n = STEP_NUM[name];
    if (n && progText) {
      progText.textContent = "Step " + n + " of " + progDots.length;
      progDots.forEach(function (d, i) { d.classList.toggle("on", i < n); });
    }
    // The overlay is the scroll surface (legal rail below the fold) —
    // every step change starts back at the card.
    modal.scrollTop = 0;
  }
  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    show("contact");
    // Focus the dialog (not an input) so the mobile keyboard doesn't pop up.
    if (card) card.focus();
  }
  // Z-beat interstitial: one-shot logo dance between steps. The final step
  // (SMS -> report) exits directly, per design.
  var zbeat = modal.querySelector(".lm-zbeat");
  var beatSeq = 0; // stale-timer guard: only the latest beat's timer may act
  function runZBeat(target) {
    if (!zbeat) { show(target); if (card) card.focus(); return; }
    var my = ++beatSeq;
    show("zbeat");
    zbeat.classList.remove("run", "run-full");
    void zbeat.offsetWidth; // restart the one-shot on every transition
    zbeat.classList.add("run");
    setTimeout(function () { if (my === beatSeq) { show(target); if (card) card.focus(); } }, 1650);
  }
  // Finale before the report: full cycle (in, hold, back out), no caption
  // (Lucas 2026-07-27: just the animation), then hand off — FinalizeLead
  // runs underneath it.
  function runZBeatFinale(cb) {
    if (!zbeat) { cb(); return; }
    var my = ++beatSeq;
    show("zbeat");
    zbeat.classList.remove("run", "run-full");
    void zbeat.offsetWidth;
    zbeat.classList.add("run-full");
    setTimeout(function () { if (my === beatSeq) cb(); }, 3350);
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---- progressive phone formatting: (123) 456-7890 ----
  function formatPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 10);
    var a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10);
    if (d.length > 6) return "(" + a + ") " + b + "-" + c;
    if (d.length > 3) return "(" + a + ") " + b;
    if (d.length > 0) return "(" + a;
    return "";
  }
  phoneEl.addEventListener("input", function () {
    phoneEl.value = formatPhone(phoneEl.value);
    phoneEl.classList.remove("invalid");
    errEl.hidden = true;
  });
  [nameEl, emailEl].forEach(function (el) {
    el.addEventListener("input", function () { el.classList.remove("invalid"); errEl.hidden = true; });
  });

  // The member's name lives inside the consent sentence.
  var consPros = modal.querySelector(".lm-cons-pros");

  var termsBox = null, termsCheck = null, inlinePros = null;
  // ---- z-param contact prefill (email/SMS landing links) ----
  // e.g. ?zfname=Alex&zlastname=Smith&zphone=6238805511&zemail=alex@gmail.com
  var qp = new URLSearchParams(window.location.search);
  if (qp.get("zfname") || qp.get("zlastname")) {
    nameEl.value = ((qp.get("zfname") || "") + " " + (qp.get("zlastname") || "")).trim();
  }
  if (qp.get("zphone")) phoneEl.value = formatPhone(qp.get("zphone"));
  if (qp.get("zemail")) emailEl.value = qp.get("zemail");

  // ---- Pulse partial-lead capture (docs: send on blur, not per keystroke) ----
  if (P) {
    nameEl.addEventListener("blur", function () { psave(P.F.name, nameEl.value.trim()); });
    phoneEl.addEventListener("blur", function () { psave(P.F.phone, phoneDigits(phoneEl.value)); });
    emailEl.addEventListener("blur", function () { psave(P.F.email, emailEl.value.trim()); });

    // DEMO: the displayed member is pinned to the persona in the markup
    // (Jason Dalbey) — the live GetContactOptInNames pool returns company
    // records ("HousingNow.com"), not a person, so the live render is skipped
    // and no OptInContactID is recorded (Lucas 2026-08-20). Flip the flag to
    // restore live names.
    var DEMO_PINNED_MEMBER = true;
    if (!DEMO_PINNED_MEMBER) P.getOptInContacts().then(function (d) {
      if (!d || !d.contactOptInNames || !d.contactOptInNames.length) return;
      // v2 sells exclusively (Lucas 2026-08-19): only the FIRST contact on
      // the list is shown, consented to, and recorded — never a roster, never
      // per-pro checkboxes. The v1 previews below keep the multi-pro render.
      if (expertOpt) d = { contactOptInNames: [d.contactOptInNames[0]], renderAsCheckboxes: false };
      optInData = d;
      // Record exactly which contact set this user was shown.
      psave(P.F.contactOptInNames, JSON.stringify(d.contactOptInNames));
      psave(P.F.contactOptInNamesRender, d.renderAsCheckboxes ? "True" : "False");
      var box = modal.querySelector(".lm-matched");
      if (!box) return;
      var namesStr = d.contactOptInNames.map(function (c) {
        return c.displayName + (c.displayCompany ? " (" + c.displayCompany + ")" : "");
      }).join("; ");
      var label = d.contactOptInNames.length > 1 ? "Matched real estate pros:" : "Matched real estate pro:";
      box.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = label;
      box.appendChild(b);
      if (d.renderAsCheckboxes) {
        // TrustedForm 1:1 tagging: selectable advertisers use the NUMBERED
        // input/name pairs, and the sentence's generic advertiser span must
        // drop its role (it reads "the pros selected above", not a name).
        var advSpan = document.getElementById("consAdvertiser");
        if (advSpan) advSpan.removeAttribute("data-tf-element-role");
        d.contactOptInNames.forEach(function (c, i) {
          var row = document.createElement("label");
          row.className = "lm-optin";
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = c.contactID;
          cb.checked = !!c.preSelected;
          cb.setAttribute("data-tf-element-role", "consent-opted-advertiser-input-" + (i + 1));
          row.appendChild(cb);
          var nm = document.createElement("b");
          nm.className = "lm-names";
          nm.setAttribute("data-tf-element-role", "consent-opted-advertiser-name-" + (i + 1));
          nm.textContent = c.displayName + (c.displayCompany ? " (" + c.displayCompany + ")" : "");
          row.appendChild(nm);
          box.appendChild(row);
        });
      } else {
        box.appendChild(document.createTextNode(" "));
        var names = document.createElement("b");
        names.className = "lm-names";
        names.textContent = namesStr;
        box.appendChild(names);
      }
      // The live names belong inside the consent sentence — default variant
      // (.lm-cons-pros) and inline variant (.lm-inline-pros) alike. The
      // standalone list only shows when the API renders per-pro checkboxes
      // (then it IS the selection UI and the sentence points at it).
      box.hidden = !d.renderAsCheckboxes;
      var inSentence = d.renderAsCheckboxes ? "the real estate pros selected above" : namesStr;
      if (consPros) consPros.textContent = inSentence;
      if (inlinePros) inlinePros.textContent = inSentence;
    });
  }

  // ---- intent chips ----
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      intentValue = chip.getAttribute("data-val");
      intentLabel = chip.textContent.trim();
      if (P) psave(P.F.sellingTimeFrame, intentLabel);
      chips.forEach(function (c) {
        c.classList.toggle("sel", c === chip);
        c.setAttribute("aria-checked", c === chip ? "true" : "false");
      });
      chipsWrap.classList.remove("invalid");
      errEl.hidden = true;
      if (qErr) qErr.hidden = true;
    });
  });

  // ---- questions step (Tune your report): focus chips + repairs slider ----
  // Report-focus chips are optional — no validation, saved on tap.
  var qErr = document.getElementById("qErr");
  var focusWrap = document.getElementById("focusChips");
  var focusLabel = "";
  if (focusWrap) {
    // "Both" ships pre-selected (visible default — continuing past it is an
    // answer); the markup's .sel chip seeds the value.
    var preFocus = focusWrap.querySelector(".lm-chip.sel");
    if (preFocus) focusLabel = preFocus.textContent.trim();
    focusWrap.querySelectorAll(".lm-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        focusLabel = chip.textContent.trim();
        focusWrap.querySelectorAll(".lm-chip").forEach(function (c) {
          c.classList.toggle("sel", c === chip);
          c.setAttribute("aria-checked", c === chip ? "true" : "false");
        });
        if (P) psave(P.F.whySelling, focusLabel);
      });
    });
  }

  // Repairs slider: wedge fills to the dial; the default (untouched) state
  // sends nothing — "No repairs" is only data once the user actually says so.
  // Display is iconic (sparkle = move-in ready, then 1-4 hammers); the text
  // labels live on as aria-valuetext and as the RepairsNeeded field value.
  var REPAIR_LABELS = ["No repairs — move-in ready", "A few touch-ups", "Some repairs", "Several repairs", "Major repairs", "A full remodel"];
  var HAMMER_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5.245 8.07l2.83-2.827 14.14 14.142-2.828 2.828z"/><path d="M12.317 1l5.657 5.656-2.83 2.83-5.654-5.66z"/><path d="M3.825 9.485l5.657 5.657-2.828 2.828-5.657-5.657z"/></svg>';
  // Gold, not gray: luminance (not hue) carries the "shiny" read, so it
  // stays bright for colorblind users too.
  var SPARKLE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#F5A623" d="M12 2.5l2.2 6.7L21 11.4l-6.8 2.2L12 20.3l-2.2-6.7L3 11.4l6.8-2.2z"/><path fill="#FFC957" d="M19.2 2l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8z"/><path fill="#FFD98A" d="M5.6 16.8l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/></svg>';
  var repairsSlider = document.getElementById("repairsSlider");
  var repairsTouched = false;
  if (repairsSlider) {
    var repairsWedge = document.getElementById("repairsWedge");
    var repairsVal = document.getElementById("repairsVal");
    var repairsDial = document.getElementById("repairsDial");
    // The track has 21 positions (0-20) so dragging feels smooth; display
    // and data bucket into 6 levels: the sparkle is strictly ZERO, then
    // hammers equal the level (1-5). The LEFT axis text is live — "none"
    // in hammer blue at rest, then the level's label; at max it hides and
    // the right edge ("a full remodel") takes the highlight instead.
    var repairLevel = function () { return Math.round(parseInt(repairsSlider.value, 10) / 4); };
    var repairsLo = document.getElementById("repairsLo");
    var repairsHi = document.getElementById("repairsHi");
    var paintWedge = function () {
      var v = parseInt(repairsSlider.value, 10);
      var frac = v / 20;
      var lvl = repairLevel();
      repairsVal.innerHTML = lvl === 0 ? SPARKLE_SVG : new Array(lvl + 1).join(HAMMER_SVG);
      if (repairsLo && repairsHi) {
        var maxed = lvl === REPAIR_LABELS.length - 1;
        // visibility (not display): space-between must keep the right edge put
        repairsLo.style.visibility = maxed ? "hidden" : "visible";
        repairsLo.textContent = lvl === 0 ? "none" : REPAIR_LABELS[lvl].toLowerCase();
        repairsHi.classList.toggle("on", maxed);
      }
      repairsVal.classList.toggle("zero", lvl === 0);
      repairsSlider.setAttribute("aria-valuetext", REPAIR_LABELS[lvl]);
      // Our own dial (the native thumb is invisible — iOS ignores custom
      // thumb geometry): center travels [8px, width-8px], the wedge's ends.
      if (repairsDial) repairsDial.style.left = "calc(" + (frac * 100) + "% - " + (frac * 16) + "px)";
      var p = frac * 100;
      repairsWedge.style.background = v === 0
        ? "linear-gradient(90deg,#E4EAF3 0%,#E4EAF3 100%)"
        : "linear-gradient(90deg,#7FC4FF 0%,#1D4FD7 " + p + "%,#E4EAF3 " + p + "%,#E4EAF3 100%)";
    };
    paintWedge(); // position the dial at the default stop on load
    repairsSlider.addEventListener("input", function () { repairsTouched = true; paintWedge(); });
    repairsSlider.addEventListener("change", function () {
      repairsTouched = true;
      paintWedge();
      if (P) psave(P.F.repairsNeeded, REPAIR_LABELS[repairLevel()]);
    });

    // Pointer events drive the control directly — iOS accepts taps on an
    // appearance:none range input but won't track drags (drag capture
    // belongs to the native thumb we removed). The input is pointer-inert
    // (CSS) and kept for keyboard/screen readers.
    var wedgeBox = repairsWedge.parentNode; // .lm-wedge
    var dragging = false;
    var setFromX = function (clientX) {
      var r = wedgeBox.getBoundingClientRect();
      var frac = (clientX - r.left - 8) / (r.width - 16);
      frac = Math.max(0, Math.min(1, frac));
      var v = String(Math.round(frac * 20));
      if (v !== repairsSlider.value) {
        repairsSlider.value = v;
        repairsTouched = true;
        paintWedge();
      }
    };
    wedgeBox.addEventListener("pointerdown", function (e) {
      dragging = true;
      if (wedgeBox.setPointerCapture) { try { wedgeBox.setPointerCapture(e.pointerId); } catch (err) {} }
      setFromX(e.clientX);
      e.preventDefault();
    });
    wedgeBox.addEventListener("pointermove", function (e) { if (dragging) setFromX(e.clientX); });
    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      repairsSlider.dispatchEvent(new Event("change")); // commits the RepairsNeeded save
    };
    wedgeBox.addEventListener("pointerup", endDrag);
    wedgeBox.addEventListener("pointercancel", endDrag);
  }

  var qContinue = document.getElementById("qContinue");
  if (qContinue) {
    qContinue.addEventListener("click", function () {
      if (!intentValue) {
        chipsWrap.classList.add("invalid");
        qErr.textContent = "Please tell us if you’re open to selling.";
        qErr.hidden = false;
        // Shake the chips + bounce the message in — restartable on every
        // repeat tap (remove class, force reflow, re-add).
        chipsWrap.classList.remove("shake");
        qErr.classList.remove("pop");
        void chipsWrap.offsetWidth;
        chipsWrap.classList.add("shake");
        qErr.classList.add("pop");
        return;
      }
      qErr.hidden = true;
      if (P) {
        psave(P.F.sellingTimeFrame, intentLabel || intentValue);
        if (focusLabel) psave(P.F.whySelling, focusLabel);
        if (repairsTouched) psave(P.F.repairsNeeded, REPAIR_LABELS[repairLevel()]);
      }
      runZBeat("special");
    });
  }

  // ---- open on hero submit (require an address first) ----
  heroForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!addr.value.trim()) { addr.focus(); return; }
    // Structured Smarty picks save their components from address-autocomplete;
    // a raw typed address still reaches the partial lead as the street field.
    if (P && !window.zbSelectedAddress) psave(P.F.street, addr.value.trim());
    if (P) { psave(P.F.addressSubmitClicked, "true"); psave(P.F.contactFormDisplayed, "true"); }
    // The report greets the seller with the address they submitted — keep a
    // display copy even when it was typed rather than picked from Smarty.
    if (!window.zbSelectedAddress) {
      try { sessionStorage.setItem("zbAddressDisplay", addr.value.trim()); } catch (err) {}
    }
    open();
  });

  // ---- close / back ----
  modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden && (!DR || current === "contact")) close();
  });
  var backBtn = modal.querySelector("[data-back]");
  // (textPhone is initialized below; clicks only happen after init)
  if (backBtn) backBtn.addEventListener("click", function () { show(SMS_STEP && textPhone ? "textreport" : "special"); });

  // ---- contact step -> advance to report step ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var digits = phoneEl.value.replace(/\D/g, "");
    var email = emailEl.value.trim();

    [nameEl, phoneEl, emailEl].forEach(function (el) { el.classList.remove("invalid"); });

    var err = "", bad = null;
    if (!name) { err = "Please enter your name."; bad = nameEl; }
    else if (digits.length < 10) { err = "Please enter a valid phone number."; bad = phoneEl; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err = "Please enter a valid email address."; bad = emailEl; }
    else if (termsCheck && !termsCheck.checked) { err = "Please check the box to agree to the terms."; bad = termsBox; }

    if (err) {
      bad.classList.add("invalid");
      errEl.textContent = err; errEl.hidden = false;
      if (bad === termsBox) {
        // Same treatment as the intent chips: shake the whole box and
        // bounce the message in — restartable on every repeat tap.
        termsBox.classList.remove("shake");
        errEl.classList.remove("pop");
        void termsBox.offsetWidth;
        termsBox.classList.add("shake");
        errEl.classList.add("pop");
      } else {
        errEl.classList.remove("pop");
      }
      return;
    }
    errEl.hidden = true;

    // Ensure every contact field reaches the partial lead even if a blur
    // never fired (autofill, z-param prefill), plus the submit-time record:
    // lifecycle flag, the exact TCPA text displayed, the TrustedForm cert
    // (their script fills a hidden xxTrustedFormCertUrl input when present),
    // ListedQuestion default, and the contact opt-ins.
    if (P) {
      psave(P.F.name, name);
      psave(P.F.phone, phoneDigits(phoneEl.value));
      psave(P.F.email, email);
      psave(P.F.contactFormSubmit, "true");
      psave(P.F.listedQuestion, "No"); // from OnboardAPI once that's ready
      // v2: the checkbox IS the consent moment — record the opt (and the
      // opt-in contacts below) only when it was actually given.
      if (expertOpt && expertOpt.checked) psave(P.F.realtorOpt, "ok");
      // In the inline variant the matched line is hidden (names live in the
      // consent sentence) — record only what was actually displayed.
      var mEl = modal.querySelector(".lm-matched"), cEl = modal.querySelector(".lm-consent"),
          aEl = modal.querySelector(".lm-agree");
      psave(P.F.tcpaTerms, (((mEl && !mEl.hidden) ? mEl.textContent : "") + " " + (cEl ? cEl.textContent : "") + " " + (aEl ? aEl.textContent : "")).replace(/\s+/g, " ").trim());
      // FieldValue is the BARE cert token (Lucas 2026-07-30) — the server
      // rebuilds https://cert.trustedform.com/<token> for the Retain claim.
      var tf = document.getElementsByName("xxTrustedFormCertUrl")[0];
      if (tf && tf.value) psave(P.F.tfCertURL, tf.value.split("/").pop());
      if (optInData && (!expertOpt || expertOpt.checked)) {
        if (optInData.renderAsCheckboxes) {
          modal.querySelectorAll(".lm-optin input:checked").forEach(function (cb) {
            psave(P.F.optInContact, cb.value);
          });
        } else {
          // Static disclosure list: every named contact is part of the deal.
          optInData.contactOptInNames.forEach(function (c) {
            psave(P.F.optInContact, c.contactID);
          });
        }
      }
    }

    runZBeat("questions");
  });

  // ---- Access-anytime step: text the report link, before the all-set step ----
  // Prefilled with the contact step's phone; "Text my Report" needs 10
  // digits and records SMSOptIn=true (+ the possibly-corrected number).
  // The no-thanks link records SMSOptIn=false and flags the session so the
  // report page's "we texted you" notice stays hidden.
  var textPhone = document.getElementById("textPhone");
  var textErr = document.getElementById("textErr");
  var textOpt = null; // null until the step is answered
  if (textPhone) {
    textPhone.addEventListener("input", function () {
      textPhone.value = formatPhone(textPhone.value);
      textPhone.classList.remove("invalid");
      if (textErr) textErr.hidden = true;
    });
    document.getElementById("textReport").addEventListener("click", function () {
      var d = phoneDigits(textPhone.value);
      if (!d) {
        textPhone.classList.add("invalid");
        textErr.textContent = "Please enter a valid mobile number.";
        textErr.hidden = false;
        return;
      }
      textOpt = true;
      try { sessionStorage.removeItem("zbNoText"); } catch (e) {}
      if (P) { psave(P.F.phone, d); psave(P.F.smsOptIn, "true"); }
      runZBeat("allset");
    });
    document.getElementById("noText").addEventListener("click", function () {
      textOpt = false;
      try { sessionStorage.setItem("zbNoText", "1"); } catch (e) {}
      if (P) psave(P.F.smsOptIn, "false");
      runZBeat("allset");
    });
  }

  // ---- all-set (RealtorOpt) step: now the LAST step before the report ----
  document.getElementById("toSms").addEventListener("click", function () {
    // The all-set step is the RealtorOpt step in the lead record.
    if (P && (!expertOpt || expertOpt.checked)) psave(P.F.realtorOpt, "ok");
    goToReport();
  });
  // "Do not contact me": records DNC=true, fires NO RealtorOpt, still gets
  // the report. (Guarded: ?dnc=0 removes the element above.)
  var noContactBtn = document.getElementById("noContact");
  if (noContactBtn) noContactBtn.addEventListener("click", function () {
    if (P) psave(P.F.dnc, "true");
    goToReport();
  });

  // ---- SomethingSpecial step: free text + tap-to-add suggestion chips.
  // Obviously optional — one button, no validation; sends SomethingSpecial
  // only if the box carries anything. ----
  // FinalizeLead posts every collected field and returns pixel-tracking HTML
  // that the report page injects (stashed in sessionStorage across the
  // navigation). Never block the user on a slow/failed finalize: navigate
  // after 2.5s regardless.
  function goToReport() {
    var done = false;
    function nav() { if (!done) { done = true; window.location.href = REPORT_PAGE; } }
    if (zbeat) {
      if (P) P.finalize(); // resolves during the finale; pixel stored for the report page
      runZBeatFinale(nav);
    } else if (P) {
      P.finalize().then(nav, nav);
      setTimeout(nav, 2500);
    } else {
      nav();
    }
  }

  var specialText = document.getElementById("specialText");
  var specialChips = document.getElementById("specialChips");
  if (specialChips && specialText) {
    var syncChips = function () {
      specialChips.querySelectorAll(".sp-chip").forEach(function (c) {
        c.classList.toggle("sel", specialText.value.indexOf(c.textContent.trim()) !== -1);
      });
    };
    specialChips.querySelectorAll(".sp-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var t = chip.textContent.trim();
        if (specialText.value.indexOf(t) !== -1) return; // already in the box
        var cur = specialText.value.replace(/[\s,]+$/, "");
        specialText.value = cur ? cur + ", " + t : t;
        syncChips();
      });
    });
    specialText.addEventListener("input", syncChips);

    // Desktop: mouse-drag scrolls the chip carousel (touch already scrolls
    // natively and never fires these). A 6px threshold keeps plain clicks
    // working; after a real drag the click that follows mouseup is swallowed
    // so releasing on a chip doesn't add it.
    var dragX = null, dragScroll = 0, dragged = false;
    specialChips.addEventListener("mousedown", function (e) {
      dragX = e.clientX;
      dragScroll = specialChips.scrollLeft;
      dragged = false;
      e.preventDefault(); // no text-selection drag
    });
    window.addEventListener("mousemove", function (e) {
      if (dragX === null) return;
      var dx = e.clientX - dragX;
      if (Math.abs(dx) > 6) {
        dragged = true;
        specialChips.classList.add("dragging");
      }
      if (dragged) specialChips.scrollLeft = dragScroll - dx;
    });
    window.addEventListener("mouseup", function () {
      dragX = null;
      specialChips.classList.remove("dragging");
    });
    specialChips.addEventListener("click", function (e) {
      if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
    }, true);
  }
  document.getElementById("viewReport").addEventListener("click", function () {
    if (P && specialText && specialText.value.trim()) {
      psave(P.F.somethingSpecial, specialText.value.trim());
    }
    // v2: the all-set line only promises an expert when the member consent
    // was actually given; otherwise the report stands alone.
    var allsetSub = modal.querySelector('[data-screen="allset"] .lm-sub');
    if (expertOpt && allsetSub) {
      if (expertOpt.checked) {
        // Name the member the seller just consented to (v2 is exclusive:
        // the first live contact, or the consent sentence's demo name).
        var c0 = optInData && optInData.contactOptInNames && optInData.contactOptInNames[0];
        var mNm = "", mCo = "";
        if (c0) { mNm = c0.displayName; mCo = c0.displayCompany || ""; }
        else {
          var mb = modal.querySelector(".lm-cons-pros");
          var mm = (mb ? mb.textContent.trim() : "").match(/^([^(]+?)\s*(?:\(([^)]+)\))?$/);
          if (mm) { mNm = (mm[1] || "").trim(); mCo = (mm[2] || "").trim(); }
        }
        allsetSub.textContent = mNm
          ? mNm + ", your local expert" + (mCo ? " with " + mCo : "") + ", will be in touch shortly to discuss your cash value and your best selling options."
          : "Your local expert will be in touch shortly to discuss your cash value and your best selling options.";
      } else {
        allsetSub.textContent = "Your Cash Value Report is ready \u2014 review it whenever you like. No one will reach out unless you ask.";
      }
    }
    // Access-anytime step opens with the contact step's number in place.
    if (textPhone && !textPhone.value) textPhone.value = phoneEl.value;
    runZBeat(SMS_STEP && textPhone ? "textreport" : "allset");
  });
})();
