/* zbEstimateTray — "which estimates have arrived" bottom tray. One file, no
 * dependencies, styles self-inject. Share this file as-is.
 *
 * WHAT IT IS
 *   A footer that slides up over the report when it loads: three horizontal
 *   sections, one per estimate source (default: AI estimate, AVM estimate,
 *   Cash offer estimate). Each section stacks vertically — a source icon
 *   with the CHECKBOX INTEGRATED as a badge on its corner, and a small
 *   label underneath. While a source is processing, the unchecked badge
 *   carries the waiting animation (a bright segment chasing its border).
 *   When the value arrives the chase stops, the badge fills, and the
 *   checkmark draws itself in. After all sections are checked the tray
 *   holds briefly, then MINIMIZES to a corner pill ("Estimates 3/3") — the
 *   chevron minimizes it manually at any time, and the pill reopens it.
 *
 * USAGE
 *   <script src="estimate-tray.js"></script>
 *   <script>
 *     var tray = zbEstimateTray({
 *       items: [                          // optional; these are the defaults
 *         { id: "ai",   label: "AI estimate",         icon: "ai"   },
 *         { id: "avm",  label: "AVM estimate",        icon: "avm"  },
 *         { id: "cash", label: "Cash offer estimate", icon: "cash" }
 *       ],                                // icon: "ai"|"avm"|"cash" or a raw
 *                                         // "<svg ...>" string of your own.
 *                                         // items also take color: "#16408F" —
 *                                         // that item's icon + badge use it
 *                                         // (pair with the value slider's
 *                                         // range colors); omitted = the
 *                                         // --zet-check theme color
 *       demo: { seconds: [3, 7, 10] },    // OPTIONAL stand-in for the real
 *                                         // calls: per-item arrival seconds
 *                                         // (a single number staggers evenly)
 *       dismissSeconds: 1.6,              // hold after ALL arrive, then
 *                                         // auto-minimize to the pill
 *                                         // (0 = stay up until minimized)
 *       title: "Gathering your estimates…", // header text (optional)
 *       titleDone: "All estimates in",      // header text once complete
 *       onArrive:   function (id) {},     // fires per estimate
 *       onComplete: function () {}        // fires when all have arrived
 *     });
 *     // real wiring (omit `demo`): call this from each API response —
 *     tray.arrive("avm");
 *     // also: tray.minimize()  tray.open()  tray.destroy()  tray.element
 *   </script>
 *
 * THEMING (CSS custom properties on <body> or any ancestor)
 *   --zet-check (icons + badge, default #1D4FD7)  --zet-line (borders #E4EAF3)
 *   --zet-ink (done label #14233D)                --zet-muted (waiting label #5C6B82)
 *
 * Reduced motion: no chase, no slide, checks appear instantly.
 */
(function (global) {
  "use strict";

  var uid = 0;

  var CSS =
    /* desktop: a floating card bottom-right (a full-width strip disappears
       down there on big screens); mobile: the full-width bottom tray */
    ".zet-tray{position:fixed;right:18px;bottom:18px;z-index:400;width:min(430px,calc(100vw - 36px));background:#fff;border:1px solid var(--zet-line,#E4EAF3);border-radius:18px;box-shadow:0 24px 60px -18px rgba(14,27,51,.5);transform:translateY(calc(100% + 30px));transition:transform .45s cubic-bezier(.2,.7,.3,1)}" +
    ".zet-tray.zet-in{transform:none}" +
    ".zet-head{display:flex;align-items:center;justify-content:space-between;padding:13px 10px 0 18px}" +
    ".zet-title{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--zet-muted,#5C6B82)}" +
    ".zet-row{display:flex;align-items:stretch;justify-content:center;padding:12px 14px 14px}" +
    "@media (max-width:720px){" +
    ".zet-tray{left:0;right:0;bottom:0;width:auto;border-radius:18px 18px 0 0;border-left:none;border-right:none;border-bottom:none;box-shadow:0 -16px 44px -20px rgba(14,27,51,.4);transform:translateY(110%)}" +
    ".zet-tray.zet-in{transform:none}" +
    ".zet-row{max-width:760px;margin:0 auto}}" +
    /* three vertical stacks: icon (with badge) over a small label */
    ".zet-item{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 0;min-width:110px;padding:2px 10px}" +
    ".zet-item+.zet-item{border-left:1px solid var(--zet-line,#E4EAF3)}" +
    ".zet-ico{position:relative;width:36px;height:36px;color:var(--zet-check,#1D4FD7)}" +
    ".zet-ico>svg{display:block;width:36px;height:36px}" +
    /* the checkbox rides the icon's corner on a white backing */
    ".zet-box{position:absolute;right:-8px;bottom:-6px;width:18px;height:18px;background:#fff;border-radius:5px;box-shadow:0 1px 4px rgba(14,27,51,.18)}" +
    ".zet-box svg{display:block;width:18px;height:18px;overflow:visible}" +
    /* waiting: faint full border + one bright segment chasing the perimeter */
    ".zet-run{animation:zetChase 1.4s linear infinite}" +
    "@keyframes zetChase{to{stroke-dashoffset:-72}}" +
    ".zet-lbl{font-size:11.5px;font-weight:600;color:var(--zet-muted,#5C6B82);letter-spacing:-.01em;white-space:nowrap;transition:color .25s;text-align:center}" +
    ".zet-item.zet-done .zet-lbl{color:var(--zet-ink,#14233D);font-weight:700}" +
    /* arrival: badge pops, fill fades in, check draws itself */
    ".zet-item.zet-done .zet-box{animation:zetPop .32s ease}" +
    "@keyframes zetPop{45%{transform:scale(1.2)}}" +
    ".zet-fill{opacity:0;transition:opacity .22s}" +
    ".zet-item.zet-done .zet-fill{opacity:1}" +
    ".zet-tick{stroke-dasharray:16;stroke-dashoffset:16}" +
    ".zet-item.zet-done .zet-tick{transition:stroke-dashoffset .3s ease .12s;stroke-dashoffset:0}" +
    /* minimize chevron (in the header) + the restored-from pill */
    ".zet-min{width:28px;height:28px;border:none;background:none;border-radius:50%;cursor:pointer;color:#98A6BC;display:flex;align-items:center;justify-content:center;padding:0;flex:none}" +
    ".zet-min:hover{background:var(--zet-line,#E4EAF3);color:var(--zet-ink,#14233D)}" +
    ".zet-pill{position:fixed;right:14px;bottom:12px;z-index:400;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--zet-line,#E4EAF3);border-radius:999px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;line-height:1;color:var(--zet-ink,#14233D);box-shadow:0 10px 26px -12px rgba(14,27,51,.4);cursor:pointer;transform:translateY(200%);transition:transform .3s ease}" +
    ".zet-pill.zet-in{transform:none}" +
    ".zet-pill b{color:var(--zet-check,#1D4FD7)}" +
    "@media (prefers-reduced-motion:reduce){" +
    ".zet-tray{transition:none}.zet-run{animation:none}" +
    ".zet-item.zet-done .zet-box{animation:none}" +
    ".zet-fill{transition:none}.zet-item.zet-done .zet-tick{transition:none}" +
    ".zet-pill{transition:none}}";

  /* built-in source icons (24 viewBox, drawn with currentColor) */
  var ICONS = {
    // AI: a large four-point spark with two companions
    ai: '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M10.5 3.5l1.7 4.9 4.9 1.7-4.9 1.7-1.7 4.9-1.7-4.9L4 10.1l4.8-1.7z"/><path fill="currentColor" opacity=".55" d="M18.3 4.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/><path fill="currentColor" opacity=".35" d="M16.6 15.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>',
    // AVM: a house with a rising valuation line inside
    avm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5L12 3.8l8.5 6.7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M8.3 16.2l2.4-2.4 1.8 1.8 3.2-3.4"/></svg>',
    // cash: a circled dollar
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.4v9.2M14.4 9.3c-.5-.9-1.4-1.3-2.4-1.3-1.3 0-2.4.8-2.4 1.9 0 2.5 4.8 1.4 4.8 3.9 0 1.2-1.1 1.9-2.4 1.9-1.1 0-2.1-.5-2.5-1.5"/></svg>',
    // fallback: a simple gauge
    generic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 15.5a8 8 0 1 1 16 0"/><path d="M12 15.5l3.6-4.4"/></svg>'
  };

  function injectCSS() {
    if (document.getElementById("zet-style")) return;
    var s = document.createElement("style");
    s.id = "zet-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(n, attrs, parent) {
    var e = document.createElementNS(NS, n);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function zbEstimateTray(opts) {
    opts = opts || {};
    var items = (opts.items && opts.items.length ? opts.items : [
      { id: "ai", label: "AI estimate", icon: "ai" },
      { id: "avm", label: "AVM estimate", icon: "avm" },
      { id: "cash", label: "Cash offer estimate", icon: "cash" }
    ]).map(function (it) {
      return { id: String(it.id), label: it.label || String(it.id), icon: it.icon || it.id,
               color: it.color || "" };
    });
    var dismissSeconds = opts.dismissSeconds === undefined ? 1.6 : +opts.dismissSeconds;
    var id = ++uid;

    injectCSS();
    var cs = getComputedStyle(document.body);
    var CHECK = (cs.getPropertyValue("--zet-check") || "").trim() || "#1D4FD7";
    var LINE = (cs.getPropertyValue("--zet-line") || "").trim() || "#E4EAF3";

    var tray = document.createElement("div");
    tray.className = "zet-tray";
    tray.setAttribute("role", "status");
    tray.setAttribute("aria-live", "polite");
    // header: live title + the minimize chevron
    var head = document.createElement("div");
    head.className = "zet-head";
    var title = document.createElement("span");
    title.className = "zet-title";
    title.textContent = opts.title || "Gathering your estimates…";
    head.appendChild(title);
    tray.appendChild(head);
    var row = document.createElement("div");
    row.className = "zet-row";
    tray.appendChild(row);

    var state = {};
    items.forEach(function (it) {
      var el = document.createElement("div");
      el.className = "zet-item";
      // the source icon, with the checkbox badge riding its corner
      var itCol = it.color || CHECK; // per-item color: icon + badge together
      var ico = document.createElement("span");
      ico.className = "zet-ico";
      if (it.color) ico.style.color = it.color;
      ico.innerHTML = String(it.icon).indexOf("<svg") === 0 ? it.icon : (ICONS[it.icon] || ICONS.generic);
      var box = document.createElement("span");
      box.className = "zet-box";
      // the unchecked badge IS the spinner: faint rounded-rect border with a
      // bright segment chasing its ~72px perimeter (18x18 rx5 @2,2 in a 22 box)
      var svg = svgEl("svg", { viewBox: "0 0 22 22" }, box);
      svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: LINE, "stroke-width": 2.4 }, svg);
      var run = svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: itCol, "stroke-width": 2.4, "stroke-dasharray": "16 56", "stroke-linecap": "round", "class": "zet-run" }, svg);
      svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: itCol, stroke: itCol, "stroke-width": 2.4, "class": "zet-fill" }, svg);
      svgEl("path", { d: "M6.5 11.6l3.1 3.1 5.9-6.4", fill: "none", stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round", "class": "zet-tick" }, svg);
      ico.appendChild(box);
      var lbl = document.createElement("span");
      lbl.className = "zet-lbl";
      lbl.textContent = it.label;
      el.appendChild(ico);
      el.appendChild(lbl);
      row.appendChild(el);
      state[it.id] = { el: el, run: run, done: false };
    });

    // minimize chevron (right edge) + the corner pill it collapses into
    var minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.className = "zet-min";
    minBtn.setAttribute("aria-label", "Minimize");
    minBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 9.5l7 6 7-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    head.appendChild(minBtn);
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "zet-pill";
    pill.setAttribute("aria-label", "Show estimate status");
    function paintPill() {
      var done = items.filter(function (it) { return state[it.id].done; }).length;
      pill.innerHTML = "Estimates <b>" + done + "/" + items.length + "</b> " +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 14.5l7-6 7 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    paintPill();

    document.body.appendChild(tray);
    document.body.appendChild(pill);
    // slide up on the next frame so the transition runs
    requestAnimationFrame(function () { requestAnimationFrame(function () { tray.classList.add("zet-in"); }); });

    function minimize() {
      tray.classList.remove("zet-in");
      paintPill();
      pill.classList.add("zet-in");
    }
    function open() {
      pill.classList.remove("zet-in");
      tray.classList.add("zet-in");
    }
    minBtn.addEventListener("click", minimize);
    pill.addEventListener("click", open);

    var timers = [];
    function arrive(itemId) {
      var s = state[itemId];
      if (!s || s.done) return;
      s.done = true;
      s.run.remove(); // chase stops; fill + tick take over via .zet-done
      s.el.classList.add("zet-done");
      if (pill.classList.contains("zet-in")) paintPill(); // live count while minimized
      if (typeof opts.onArrive === "function") opts.onArrive(itemId);
      var allDone = items.every(function (it) { return state[it.id].done; });
      if (allDone) {
        title.textContent = opts.titleDone || "All estimates in";
        if (typeof opts.onComplete === "function") opts.onComplete();
        if (dismissSeconds > 0) timers.push(setTimeout(function () {
          if (tray.classList.contains("zet-in")) minimize(); // auto-minimize, stays recoverable
        }, dismissSeconds * 1000));
      }
    }
    function destroy() {
      timers.forEach(clearTimeout);
      if (tray.parentNode) tray.parentNode.removeChild(tray);
      if (pill.parentNode) pill.parentNode.removeChild(pill);
    }

    // demo mode: stand-in for the real API responses. seconds can be a
    // single number (arrivals staggered evenly across it) or an array of
    // per-item arrival times, matched to the items in order.
    if (opts.demo) {
      var sec = opts.demo.seconds === undefined ? 8 : opts.demo.seconds;
      items.forEach(function (it, i) {
        var at = Array.isArray(sec)
          ? (+sec[i] || +sec[sec.length - 1] || 8)
          : (+sec || 8) * (i + 1) / items.length;
        timers.push(setTimeout(function () { arrive(it.id); }, Math.round(at * 1000)));
      });
    }

    return { element: tray, arrive: arrive, minimize: minimize, open: open, destroy: destroy };
  }

  global.zbEstimateTray = zbEstimateTray;
})(window);
