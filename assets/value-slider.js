/* zbValueSlider — portable value-curve slider. No dependencies, no CSS file
 * (styles inject themselves once). Extracted from the zBuyer Cash Value
 * Report; safe to copy into any project as this single file.
 *
 * USAGE
 *   <div id="mySlider"></div>
 *   <script src="value-slider.js"></script>
 *   <script>
 *     var slider = zbValueSlider(document.getElementById("mySlider"), {
 *       anchors: [                        // 1-6 entries; sorted by value
 *         { value: 312000, label: "Quick cash close" },
 *         { value: 345000, label: "Cash+" },
 *         { value: 371000, label: "Estimated market value" }
 *       ],                                // OPTIONAL when ranges are supplied
 *       ranges: [                         // 0-4 estimate ranges INSIDE the
 *                                         // shaded curve:
 *         { id: "cash", lo: 312000, hi: 335000, value: 322000,
 *           label: "Cash offer estimate", color: "#16408F" }
 *                                         // value = the single point estimate:
 *                                         // its dot is PINNED TO THE CURVE at
 *                                         // x(value) (clamped into [lo,hi]),
 *                                         // and the range line runs
 *                                         // horizontally THROUGH the dot
 *                                         // lo→hi.
 *                                         // With <2 anchors the points are the
 *                                         // handle's SNAP TARGETS: the handle
 *                                         // appears with the first point and
 *                                         // parks at the CENTER of the union
 *                                         // of arrived values (a labeled
 *                                         // complete-range bar under the chart
 *                                         // tracks that union as it grows);
 *                                         // the fill (translucent here)
 *                                         // follows it. While HELD, the
 *                                         // headline ticks the value under the
 *                                         // handle live, the subtext names the
 *                                         // estimate range it is inside, that
 *                                         // label BOLDS, and the dot pops as
 *                                         // the handle glides over the point.
 *                                         // A snap shows the point's RANGE
 *                                         // under the value.
 *                                         // lo/hi OPTIONAL when value is
 *                                         // present: a missing side becomes
 *                                         // ±10% of the value, rounded
 *                                         // reasonably. Valueless ranges fall
 *                                         // back to a terrace line at their
 *                                         // low end's curve height.
 *       ],                                // color optional (defaults rotate
 *                                         // navy/sky/primary); the value domain
 *                                         // spans anchors + range endpoints.
 *                                         // Pinned lines never move — LABELS
 *                                         // dodge collisions (left, then
 *                                         // above-right, then below-right,
 *                                         // with lookahead over known lines);
 *                                         // valueless terraces stagger 18px.
 *       domain: { lo: 312000, hi: 371000 }, // OPTIONAL scale pin (no visuals):
 *                                         // fixes the chart's span up front so
 *                                         // addRange() arrivals draw in place
 *                                         // instead of rescaling. domain alone
 *                                         // (no anchors/ranges) renders the
 *                                         // static chart, empty, ready — with
 *                                         // the headline + end labels behind
 *                                         // shimmering skeletons until ranges
 *                                         // land (each end label reveals once
 *                                         // the union REACHES that end), so a
 *                                         // pinned domain never leaks its
 *                                         // extremes before the data exists.
 *       loadingImage: "z-sphere.webp",    // OPTIONAL: ONE small looping image
 *                                         // centered in the pending headline
 *                                         // (one sphere per container); the
 *                                         // end labels wait as quiet static
 *                                         // pills. loadingSize (default 40)
 *                                         // sets its px height — match it
 *                                         // across the page. Reduced motion
 *                                         // falls back to static pills.
 *       format:   function (v) { ... },   // optional; default $1,234,567
 *       headline: true,                   // big number/range above the track
 *       rangeLabel: "Complete home value range", // sub-label while the headline
 *                                         // shows the untouched full range
 *                                         // (default shown; "" hides it)
 *       endLabels: true,                  // min/max labels under the track
 *       onSelect: function (anchor, index) { ... }, // fires on every snap
 *       colors: {                         // optional; all keys optional
 *         handle: "#FF6B4A",              //   the pill
 *         fillLo: "#7FC4FF",              //   gradient start of the filled chart
 *         fillHi: "#1D4FD7",              //   gradient end (rides the handle)
 *         track:  "#E4EAF3",              //   the unfilled chart
 *         dot:    "#8296B9"               //   anchor dots
 *       }                                 // (defaults shown — the classic-blue
 *                                         //  palette of the Cash Value Report)
 *       pending: {                        // OPTIONAL wait-for-offer state; needs
 *                                         // exactly ONE anchor. All keys optional:
 *         ticker: "Awaiting your cash offer. Usually arrives in under a minute.",
 *         demo:   { value: 412500, label: "Quick cash close", seconds: 6 },
 *                                         // stand-in for the API: auto-delivers
 *                                         // after seconds (default 6; legacy
 *                                         // delay in ms also honored)
 *         onDeliver: function (slider) {} // fires after the arrival re-render
 *       }
 *     });
 *     slider.snapTo(1);                   // programmatic snap (0-based)
 *     slider.deliver({ value: 412500, label: "Quick cash close" });
 *                                         // the real arrival (call from the API
 *                                         // response) — animates, then re-renders
 *     slider.addRange({ id: "avm", lo: 352000, hi: 371000,
 *                       label: "AVM estimate", color: "#1D4FD7" });
 *                                         // estimate-arrival wiring (e.g. the
 *                                         // estimate tray's onArrive): draws the
 *                                         // line in when it fits the current
 *                                         // scale, or rebuilds on a wider one
 *   </script>
 *
 * BEHAVIOR
 *   The track is an area chart of the anchor values: anchor x-positions and
 *   curve height are both proportional to value, normalized to the
 *   min-to-max span (auto-zoom) over an 8px value floor so the lowest
 *   anchor still reads as value. Rounded flat-tangent beziers between
 *   anchors. Blue gradient fills to the handle (deepest blue rides it),
 *   gray beyond. The handle drags freely, snaps to the nearest anchor on
 *   release, and only then does the headline swap from the full range to
 *   the snapped anchor's value, with the anchor's label in smaller, quieter
 *   type beneath it. The headline auto-shrinks so the number (or the full
 *   range) never wraps to a second line. Keyboard arrows step anchors.
 *   Every anchor gets a dot with a label tooltip.
 *
 *   ONE anchor = static display: full-height fully-filled chart, handle
 *   locked centered, no dots, no end labels, headline shows the value.
 *
 *   ONE anchor + pending = the wait-for-offer state: the fill dims under a
 *   scrim, a marching dashed preview of the future two-anchor curve is
 *   drawn with a pulsing dot where the offer will land, a quiet ticker
 *   crawls along the bottom-right (behind the inert handle), and the Z
 *   mark bobs over the landing spot. deliver(anchor) — or the pending.demo
 *   timer — runs the animated arrival: overlay lifts, the flat chart
 *   morphs into the exact two-anchor curve, headline crossfades to the
 *   range, and the widget re-renders as a live range slider with dots and
 *   end labels easing in. No flash: the morph target is pixel-identical
 *   to the re-render. Reduced-motion swaps instantly.
 *
 * THEMING (either works; script colors win over CSS vars, vars over defaults)
 *   script: the colors option above
 *   CSS custom properties on the container or any ancestor:
 *   --zvs-cta (handle)  --zvs-lo / --zvs-hi (fill gradient)
 *   --zvs-track (unfilled)  --zvs-dot  --zvs-ink  --zvs-muted
 */
(function (global) {
  "use strict";

  var CURVE_H = 57, H_MIN = 8, SLIDE_H = 96, BOTTOM = 8, PAD = 5; // px / % geometry
  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;
  // the zBuyer Z mark, two triangles in a 200x200 box (monochrome use)
  var Z_W = "40,42 128,42 64,158 39,158 95,68 40,68";
  var Z_B = "160,158 72,158 136,42 161,42 105,132 160,132";
  var REDUCED = typeof global.matchMedia === "function" &&
    global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  var CSS =
    /* fixed-height headline + sub rows: the number never jumps vertically
       when auto-fit changes its font size or the subtext changes */
    ".zvs-headline{height:46px;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;letter-spacing:-.03em;text-align:center;color:var(--zvs-ink,#14233D);margin:0 0 2px;white-space:nowrap}" +
    /* chart mode, nothing arrived yet: the complete range renders as a
       shimmering skeleton (domain text transparent underneath, so the
       placeholder is the exact final size) until the first range lands */
    ".zvs-pend{color:transparent !important;background:linear-gradient(90deg,#E4EAF3 25%,#F1F5FB 50%,#E4EAF3 75%);background-size:200% 100%;animation:zvsPendS 1.3s linear infinite;border-radius:10px;user-select:none}" +
    "@keyframes zvsPendS{to{background-position:-200% 0}}" +
    ".zvs-sub{height:19px;line-height:19px;font-size:13.5px;font-weight:600;text-align:center;color:var(--zvs-muted,#5C6B82);margin:0 0 2px;white-space:nowrap}" +
    ".zvs-slide{position:relative;height:" + SLIDE_H + "px;margin:14px 2px 2px;cursor:pointer;touch-action:none}" +
    ".zvs-slide.zvs-static{cursor:default}" +
    ".zvs-curve{position:absolute;left:0;right:0;bottom:" + BOTTOM + "px;width:100%;height:" + CURVE_H + "px;display:block}" +
    ".zvs-dot{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--zvs-dot,#8296B9);border:2px solid #fff;box-shadow:0 1px 3px rgba(14,27,51,.3);transform:translate(-50%,-50%);pointer-events:none}" +
    ".zvs-handle{position:absolute;top:59%;width:26px;height:74px;border-radius:13px;background:var(--zvs-cta,#FF6B4A);border:3px solid #fff;box-shadow:0 4px 14px rgba(14,27,51,.45);transform:translate(-50%,-50%);cursor:grab;z-index:3}" +
    ".zvs-handle::before{content:\"\";position:absolute;left:50%;top:50%;width:8px;height:22px;transform:translate(-50%,-50%);border-left:2px solid rgba(255,255,255,.8);border-right:2px solid rgba(255,255,255,.8)}" +
    ".zvs-handle.zvs-snap{transition:left .18s ease}" +
    ".zvs-handle:focus-visible{outline:none;box-shadow:0 0 0 5px rgba(29,79,215,.28),0 3px 10px rgba(14,27,51,.4)}" +
    ".zvs-slide.zvs-static .zvs-handle{cursor:default}" +
    ".zvs-ends{display:flex;justify-content:space-between;gap:14px;margin-top:10px}" +
    ".zvs-end b{display:block;font-size:15px;font-weight:800;color:var(--zvs-ink,#14233D)}" +
    ".zvs-end span{display:block;font-size:12px;color:var(--zvs-muted,#5C6B82);margin-top:2px}" +
    ".zvs-end.zvs-right{text-align:right}" +
    /* estimate ranges: colored lines inside the shaded curve (white halo so
       they read over the blue fill once the handle brings it back) */
    ".zvs-range{position:absolute;height:4px;border-radius:2px;pointer-events:none;z-index:1;box-shadow:0 0 0 1.5px rgba(255,255,255,.85);transition:width .55s cubic-bezier(.2,.7,.3,1)}" +
    ".zvs-rlabel{position:absolute;transform:translateY(-100%);font-size:10.5px;font-weight:700;letter-spacing:.01em;white-space:nowrap;pointer-events:none;z-index:1;text-shadow:0 1px 0 rgba(255,255,255,.7),0 -1px 0 rgba(255,255,255,.7)}" +
    /* the point estimate: a dot pinned to the curve edge at x(value) */
    ".zvs-rdot{position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(14,27,51,.35);transform:translate(-50%,-50%);pointer-events:none;z-index:2;transition:opacity .3s ease .3s,transform .15s ease}" +
    /* drag highlight: the estimate under the handle bolds, its dot pops */
    ".zvs-rlabel.zvs-hot{font-weight:800}" +
    ".zvs-rdot.zvs-hot{transform:translate(-50%,-50%) scale(1.35)}" +
    /* (the ranges' own dashed end-projections were removed 2026-08-04) */
    /* the complete-range bar under the chart: the union of arrived values */
    ".zvs-cwrap{position:relative;height:24px;margin:6px 2px 0}" +
    ".zvs-crange{position:absolute;top:3px;height:5px;border-radius:3px;background:linear-gradient(90deg,#7FC4FF,#1D4FD7);opacity:.5;transition:left .5s cubic-bezier(.2,.7,.3,1),width .5s cubic-bezier(.2,.7,.3,1)}" +
    ".zvs-clabel{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:10.5px;font-weight:600;color:var(--zvs-muted,#5C6B82);white-space:nowrap}" +
    /* loading chips: one per EXPECTED estimate, tray-style chase checkbox +
       label across the top of the chart; checks + flies down on arrival */
    ".zvs-chips{position:absolute;top:2px;left:0;right:0;display:flex;justify-content:center;gap:18px;pointer-events:none;z-index:2}" +
    ".zvs-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;white-space:nowrap}" +
    ".zvs-chip svg{width:14px;height:14px;overflow:visible;flex:none}" +
    ".zvs-chip path{transition:stroke-dashoffset .3s ease .05s}" +
    ".zvs-crun{animation:zvsChase 1.4s linear infinite}" +
    "@keyframes zvsChase{to{stroke-dashoffset:-72}}" +
    /* pending-offer wait state + animated arrival */
    ".zvs-wait{position:absolute;left:0;right:0;bottom:" + BOTTOM + "px;width:100%;overflow:visible;pointer-events:none;z-index:1}" +
    ".zvs-march{animation:zvsMarch 1.1s linear infinite}" +
    ".zvs-gpulse{animation:zvsPulse 1.6s ease-in-out infinite}" +
    ".zvs-arrive .zvs-dot{animation:zvsIn .5s ease both}" +
    ".zvs-arrive .zvs-ends{overflow:hidden;animation:zvsEndsIn .45s ease both}" +
    "@keyframes zvsMarch{to{stroke-dashoffset:-11}}" +
    "@keyframes zvsPulse{0%,100%{opacity:.4}50%{opacity:.95}}" +
    "@keyframes zvsIn{from{opacity:0}}" +
    "@keyframes zvsEndsIn{from{max-height:0;opacity:0}to{max-height:56px;opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.zvs-march,.zvs-gpulse,.zvs-crun,.zvs-pend{animation:none !important}.zvs-pend{background:#E4EAF3 !important}.zvs-range,.zvs-rlabel,.zvs-rdot,.zvs-crange,.zvs-chip path,.zvs-handle.zvs-snap{transition:none}}";

  function injectCSS() {
    if (document.getElementById("zvs-style")) return;
    var s = document.createElement("style");
    s.id = "zvs-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function fmtDefault(v) { return "$" + Math.round(v).toLocaleString("en-US"); }

  // round to a sensible increment for the value's magnitude ($322,417 → $322,000)
  function niceRound(v) {
    var step = Math.max(1, Math.pow(10, Math.floor(Math.log(Math.abs(v)) / Math.LN10) - 2));
    return Math.round(v / step) * step;
  }

  function normRange(r) {
    var v = r.value != null && r.value !== "" ? +r.value : null;
    // a single value with no range synthesizes ±10%, rounded reasonably
    var loIn = r.lo != null && r.lo !== "" ? +r.lo : (v != null ? niceRound(v * 0.9) : NaN);
    var hiIn = r.hi != null && r.hi !== "" ? +r.hi : (v != null ? niceRound(v * 1.1) : NaN);
    var lo = Math.min(loIn, hiIn), hi = Math.max(loIn, hiIn);
    // the point is clamped into the range — a point outside its own range is
    // a data error, not a layout job
    if (v != null) v = Math.max(lo, Math.min(hi, v));
    return { id: r.id != null ? String(r.id) : "", lo: lo, hi: hi, value: v,
             label: r.label || "", color: r.color || "" };
  }

  function svgEl(n, attrs, parent) {
    var e = document.createElementNS(NS, n);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function zbValueSlider(container, opts) {
    opts = opts || {};
    var anchors = (opts.anchors || [])
      .slice(0, 6)
      .map(function (a) { return { value: +a.value, label: a.label || "" }; })
      .sort(function (a, b) { return a.value - b.value; });
    // estimate ranges: horizontal terrace lines inside the shaded curve
    var ranges = (opts.ranges || [])
      .slice(0, 4)
      .map(normRange)
      .sort(function (a, b) { return a.lo - b.lo; });
    var dom = opts.domain && opts.domain.lo != null ? opts.domain : null;
    if (!anchors.length && !ranges.length && !dom) throw new Error("zbValueSlider: supply anchors, ranges, or a domain");
    var fmt = opts.format || fmtDefault;
    // sub-label under the untouched full-range headline (anchor labels take
    // over once the user snaps somewhere)
    var rangeLabel = opts.rangeLabel !== undefined ? opts.rangeLabel : "Complete home value range";
    // optional loading visual for the pre-arrival skeletons: ONE small
    // looping image (e.g. the Z-sphere webp) centered in the headline —
    // one sphere per container — while the end labels wait as quiet static
    // pills. Without it, everything gets the default gray shimmer.
    var loadingImage = opts.loadingImage || null;
    var loadingSize = opts.loadingSize || 40; // px, match it across the page
    function pendify(el, isHead) {
      el.classList.add("zvs-pend");
      if (loadingImage) {
        el.style.animation = "none";
        el.style.background = isHead
          ? "url('" + loadingImage + "') center / auto " + loadingSize + "px no-repeat"
          : "#E4EAF3";
      }
      return el;
    }
    function unpend(el) {
      el.classList.remove("zvs-pend");
      el.style.background = "";
      el.style.animation = "";
    }
    // the value domain spans everything supplied: anchors + range endpoints
    // (+ the optional explicit domain pin)
    var vals = anchors.map(function (a) { return a.value; });
    ranges.forEach(function (r) { vals.push(r.lo, r.hi); });
    if (dom) vals.push(+dom.lo, +dom.hi);
    var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
    var span = vmax - vmin;
    // one anchor — or one shared value across everything — renders static
    var single = !span || (!ranges.length && !dom && anchors.length === 1);
    if (single && !anchors.length) anchors = [{ value: vmin, label: ranges.length ? ranges[0].label : "" }];
    // ranges (or a pinned domain) with <2 anchors: a static CHART — curve +
    // terrace lines, no handle, no snapping
    var chartMode = !single && anchors.length < 2 && (ranges.length > 0 || !!dom);
    var interactive = !single && !chartMode;
    var id = ++uid;

    injectCSS();

    // x-position / curve-top height at any value, both value-proportional
    function pOf(v) { return single ? 50 : PAD + (v - vmin) / span * (100 - 2 * PAD); }
    function yOf(v) {
      var frac = single ? 1 : (v - vmin) / span;
      return CURVE_H - (H_MIN + frac * (CURVE_H - H_MIN));
    }
    anchors.forEach(function (a) { a.p = pOf(a.value); });
    function ay(a) { return yOf(a.value); }

    var headlineEl = null, subEl = null;
    if (opts.headline !== false) {
      headlineEl = document.createElement("p");
      headlineEl.className = "zvs-headline";
      container.appendChild(headlineEl);
      subEl = document.createElement("p");
      subEl.className = "zvs-sub"; // the snapped anchor's label, quiet, under the number
      container.appendChild(subEl);
    }
    // never let the number (or the full range) wrap: shrink to fit one line
    function setHeadline(t, label) {
      if (!headlineEl) return;
      headlineEl.textContent = t;
      headlineEl.style.fontSize = "38px";
      var w = headlineEl.clientWidth;
      if (w && headlineEl.scrollWidth > w)
        headlineEl.style.fontSize = Math.max(20, Math.floor(38 * w / headlineEl.scrollWidth)) + "px";
      subEl.textContent = label || "";
    }

    var slide = document.createElement("div");
    slide.className = "zvs-slide" + (single || chartMode ? " zvs-static" : "");
    container.appendChild(slide);

    var svg = svgEl("svg", { "class": "zvs-curve", viewBox: "0 0 1000 " + CURVE_H, preserveAspectRatio: "none", "aria-hidden": "true" }, slide);
    var d;
    if (single) {
      // one value: the whole chart IS that value — full height, edge to edge
      d = "M0 " + CURVE_H + " L0 0 L1000 0 L1000 " + CURVE_H + " Z";
    } else {
      // curve control points: every distinct supplied value (anchors + range
      // endpoints), so each terrace line's left end sits exactly on the curve
      var cvals = [];
      vals.slice().sort(function (x, y) { return x - y; }).forEach(function (v) {
        if (!cvals.length || v > cvals[cvals.length - 1]) cvals.push(v);
      });
      var pts = cvals.map(function (v) { return [pOf(v) * 10, yOf(v)]; });
      d = "M0 " + CURVE_H + " L0 " + pts[0][1] + " L" + pts[0][0] + " " + pts[0][1];
      for (var s = 0; s < pts.length - 1; s++) {
        var dx = (pts[s + 1][0] - pts[s][0]) / 2.2; // flat tangents: rounded, monotone
        d += " C" + (pts[s][0] + dx) + " " + pts[s][1] + " " + (pts[s + 1][0] - dx) + " " + pts[s + 1][1] + " " + pts[s + 1][0] + " " + pts[s + 1][1];
      }
      d += " L1000 " + pts[pts.length - 1][1] + " L1000 " + CURVE_H + " Z";
    }
    var defs = svgEl("defs", {}, svg);
    var grad = svgEl("linearGradient", { id: "zvsGrad" + id, x1: 0, y1: 0, x2: 500, y2: 0, gradientUnits: "userSpaceOnUse" }, defs);
    var lo = svgEl("stop", { offset: 0 }, grad);
    var hi = svgEl("stop", { offset: 1 }, grad);
    // color resolution: script colors option > CSS vars > zBuyer defaults
    var colors = opts.colors || {};
    var cs = getComputedStyle(container);
    function col(scriptColor, varName, fallback) {
      return scriptColor || (cs.getPropertyValue(varName) || "").trim() || fallback;
    }
    lo.setAttribute("stop-color", col(colors.fillLo, "--zvs-lo", "#7FC4FF"));
    hi.setAttribute("stop-color", col(colors.fillHi, "--zvs-hi", "#1D4FD7"));
    var clip = svgEl("clipPath", { id: "zvsClip" + id }, defs);
    var clipRect = svgEl("rect", { x: 0, y: 0, width: 500, height: CURVE_H }, clip);
    var trackPath = svgEl("path", { d: d, fill: col(colors.track, "--zvs-track", "#E4EAF3") }, svg);
    var fillPath = svgEl("path", { d: d, fill: "url(#zvsGrad" + id + ")", "clip-path": "url(#zvsClip" + id + ")" }, svg);

    // deepest blue always rides the clip edge (the handle)
    function paintCurve(p) {
      var w = Math.max(40, p * 10);
      clipRect.setAttribute("width", w);
      grad.setAttribute("x2", w);
    }

    if (interactive) {
      anchors.forEach(function (a) {
        var dot = document.createElement("span");
        dot.className = "zvs-dot";
        dot.style.left = a.p + "%";
        dot.style.top = (SLIDE_H - BOTTOM - CURVE_H + ay(a)) + "px";
        if (colors.dot) dot.style.background = colors.dot;
        dot.title = (a.label ? a.label + " — " : "") + fmt(a.value);
        slide.appendChild(dot);
      });
    }

    // snap targets: the anchors when interactive; in chart mode the ranges'
    // POINT values snap instead (they register as ranges render/arrive)
    var snaps = interactive ? anchors : [];

    var handle = null, idx = -1, dragWired = false;
    function buildHandle(locked) {
      handle = document.createElement("span");
      handle.className = "zvs-handle";
      if (colors.handle) handle.style.background = colors.handle;
      handle.tabIndex = locked ? -1 : 0;
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-label", opts.ariaLabel || "Explore the value range");
      handle.style.left = "50%";
      slide.appendChild(handle);
      if (!locked) wireDrag();
    }
    function snapTo(i) {
      if (!snaps.length || !handle) return;
      idx = Math.max(0, Math.min(snaps.length - 1, i));
      var a = snaps[idx];
      handle.classList.add("zvs-snap");
      handle.style.left = a.p + "%";
      paintCurve(a.p);
      // point snaps show the estimate's RANGE under the value
      var sub = a.lo != null ? (a.label ? a.label + " · " : "") + fmt(a.lo) + " – " + fmt(a.hi)
                             : a.label;
      setHeadline(fmt(a.value), sub);
      setHot(a.r || null, a.p);
      handle.setAttribute("aria-valuetext", fmt(a.value) + (sub ? " — " + sub : ""));
      if (typeof opts.onSelect === "function") opts.onSelect(a, idx);
    }
    // live feedback while the handle is HELD (chart mode): the headline
    // ticks the value under the handle, the subtext names whichever
    // estimate range it is inside, that estimate's label bolds, and its
    // dot pops when the handle glides over the point itself
    var drawn = []; // rendered ranges: { r, lab, dot }
    function setHot(r, p) {
      for (var i = 0; i < drawn.length; i++) {
        var d2 = drawn[i], on = d2.r === r;
        if (d2.lab) d2.lab.classList.toggle("zvs-hot", on);
        if (d2.dot) d2.dot.classList.toggle("zvs-hot",
          on && Math.abs(pOf(d2.r.value) - p) < 2.5);
      }
    }
    function liveUpdate(p) {
      if (!chartMode) return;
      var v = vmin + (p - PAD) / (100 - 2 * PAD) * span;
      var hot = null, bestD = 1e9;
      for (var i = 0; i < drawn.length; i++) {
        var q = drawn[i];
        if (v >= q.r.lo && v <= q.r.hi) {
          var d = q.r.value != null ? Math.abs(pOf(q.r.value) - p) : 50;
          if (d < bestD) { bestD = d; hot = q; }
        }
      }
      setHeadline(fmt(niceRound(v)),
        hot ? (hot.r.label ? hot.r.label + " · " : "") + fmt(hot.r.lo) + " – " + fmt(hot.r.hi)
            : rangeLabel);
      setHot(hot ? hot.r : null, p);
    }
    var touched = false; // has the user grabbed the handle yet?
    function wireDrag() {
      if (dragWired) return;
      dragWired = true;
      var dragging = false;
      function pctFromX(clientX) {
        var r = slide.getBoundingClientRect();
        return Math.max(PAD, Math.min(100 - PAD, ((clientX - r.left) / r.width) * 100));
      }
      slide.addEventListener("pointerdown", function (e) {
        dragging = true;
        touched = true;
        handle.classList.remove("zvs-snap"); // free movement while dragging
        try { slide.setPointerCapture(e.pointerId); } catch (err) {}
        var p0 = pctFromX(e.clientX);
        handle.style.left = p0 + "%";
        paintCurve(p0);
        liveUpdate(p0);
        e.preventDefault();
      });
      slide.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var p = pctFromX(e.clientX);
        handle.style.left = p + "%";
        paintCurve(p);
        liveUpdate(p);
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        var p = pctFromX(e.clientX), best = 0;
        snaps.forEach(function (a, i) {
          if (Math.abs(a.p - p) < Math.abs(snaps[best].p - p)) best = i;
        });
        snapTo(best);
      }
      slide.addEventListener("pointerup", endDrag);
      slide.addEventListener("pointercancel", endDrag);
      handle.addEventListener("keydown", function (e) {
        touched = true;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { snapTo(idx < 0 ? 0 : idx + 1); e.preventDefault(); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { snapTo(idx < 0 ? 0 : idx - 1); e.preventDefault(); }
      });
    }
    // chart mode: each range's point value becomes a snap target as it lands;
    // the handle (and the fill that rides it) returns with the first point
    function registerPoint(r) {
      snaps.push({ value: r.value, label: r.label, p: pOf(r.value), lo: r.lo, hi: r.hi, r: r });
      snaps.sort(function (a, b) { return a.value - b.value; });
      if (!handle) {
        slide.classList.remove("zvs-static"); // points make it interactive
        buildHandle(false);
      }
    }

    // the complete-range bar: the union of every arrived value, drawn under
    // the chart and labeled. The untouched handle parks at the union's
    // CENTER (re-centering as arrivals widen it) and the untouched headline
    // shows the union — so the resting state IS the complete range.
    var uLo = null, uHi = null, cBar = null, endsEl = null, pendHead = null, pendEnds = [];
    function updateUnion(r) {
      if (!chartMode) return;
      uLo = uLo === null ? r.lo : Math.min(uLo, r.lo);
      uHi = uHi === null ? r.hi : Math.max(uHi, r.hi);
      if (!cBar) {
        var cw = document.createElement("div");
        cw.className = "zvs-cwrap";
        cBar = document.createElement("span");
        cBar.className = "zvs-crange";
        cw.appendChild(cBar);
        var cl = document.createElement("span");
        cl.className = "zvs-clabel";
        cl.textContent = rangeLabel;
        cw.appendChild(cl);
        container.insertBefore(cw, endsEl);
      }
      cBar.style.left = pOf(uLo) + "%";
      cBar.style.width = (pOf(uHi) - pOf(uLo)) + "%";
      // arrivals reveal the complete range piece by piece: the headline on
      // first arrival, each end label only once the union reaches that end
      // (so a pinned domain never leaks its extremes before the data lands)
      if (pendHead) { unpend(pendHead); pendHead = null; }
      if (pendEnds[0] && uLo <= vmin) { unpend(pendEnds[0]); pendEnds[0] = null; }
      if (pendEnds[1] && uHi >= vmax) { unpend(pendEnds[1]); pendEnds[1] = null; }
      if (!touched) {
        setHeadline(fmt(uLo) + " – " + fmt(uHi), rangeLabel);
        if (handle) {
          var mid = pOf((uLo + uHi) / 2);
          handle.classList.add("zvs-snap");
          handle.style.left = mid + "%";
          paintCurve(mid);
        }
      }
    }

    if (chartMode) {
      // the curve starts UNFILLED (gray track) so the colored range lines
      // carry the color story; the fill comes back with the handle once a
      // point value registers — TRANSLUCENT here, so lines and labels stay
      // readable inside it (full-strength blue drowned the blue family).
      setHeadline(fmt(vmin) + " – " + fmt(vmax), rangeLabel);
      clipRect.setAttribute("width", 0);
      fillPath.setAttribute("opacity", ".35");
    } else if (single) {
      buildHandle(true);
      var only = anchors[0];
      handle.setAttribute("aria-valuetext", fmt(only.value) + (only.label ? " — " + only.label : ""));
      setHeadline(fmt(only.value), only.label);
      paintCurve(100);
    } else {
      buildHandle(false);
      handle.setAttribute("aria-valuetext", fmt(vmin) + " to " + fmt(vmax));
      setHeadline(fmt(vmin) + " – " + fmt(vmax), rangeLabel);
      paintCurve(50);
    }

    // end labels: the domain extremes, labeled by whichever anchor or range
    // endpoint owns each extreme (never for single)
    function labelAt(v, isLo) {
      for (var i = 0; i < anchors.length; i++) if (anchors[i].value === v) return anchors[i].label;
      for (var j = 0; j < ranges.length; j++) if ((isLo ? ranges[j].lo : ranges[j].hi) === v) return ranges[j].label;
      return "";
    }
    if (!single && opts.endLabels !== false) {
      var ends = document.createElement("div");
      endsEl = ends; // the complete-range bar inserts just above these
      ends.className = "zvs-ends";
      [{ value: vmin, label: labelAt(vmin, true) },
       { value: vmax, label: labelAt(vmax, false) }].forEach(function (a, i) {
        var end = document.createElement("div");
        end.className = "zvs-end" + (i ? " zvs-right" : "");
        var b = document.createElement("b");
        b.textContent = fmt(a.value);
        end.appendChild(b);
        if (a.label) {
          var sp = document.createElement("span");
          sp.textContent = a.label;
          end.appendChild(sp);
        }
        ends.appendChild(end);
      });
      container.appendChild(ends);
    }

    /* ---- estimate ranges. WITH a point value: the dot is pinned to the
       curve edge at x(value) and the range line runs horizontally THROUGH
       it from x(lo) to x(hi). WITHOUT a value: legacy terrace at the low
       end's curve height. HTML elements, not SVG: the curve svg stretches
       (preserveAspectRatio none) and would distort strokes. ---- */
    var RANGE_COLS = ["#16408F", "#3BA4F4", "#1D4FD7", "#8296B9"];
    var rangeCount = 0, R_INSET = 3, placedLines = [];
    var BASE_Y = SLIDE_H - BOTTOM - CURVE_H; // slide-y of the curve's top edge

    /* ---- loading chips (opts.expected, chart mode): one chase-checkbox +
       label per estimate still on its way, across the top of the chart.
       On arrival the box checks, then the chip flies DOWN to where the
       range lands and the real line/label/dot take over — loading stays
       visibly alive inside the chart itself. ---- */
    var chips = {};
    if (chartMode && opts.expected && opts.expected.length) {
      var crow = document.createElement("div");
      crow.className = "zvs-chips";
      opts.expected.forEach(function (x) {
        var id2 = String(x.id);
        var already = ranges.some(function (q) { return q.id === id2; });
        if (already) return; // pre-supplied ranges never chip
        var chip = document.createElement("span");
        chip.className = "zvs-chip";
        if (x.color) chip.style.color = x.color;
        var svg = svgEl("svg", { viewBox: "0 0 22 22" }, chip);
        svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: "rgba(20,35,61,.18)", "stroke-width": 2.4 }, svg);
        var run = svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: "currentColor", "stroke-width": 2.4, "stroke-dasharray": "16 56", "stroke-linecap": "round", "class": "zvs-crun" }, svg);
        var fill = svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "currentColor", stroke: "currentColor", "stroke-width": 2.4, opacity: 0 }, svg);
        var tick = svgEl("path", { d: "M6.5 11.6l3.1 3.1 5.9-6.4", fill: "none", stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 16, "stroke-dashoffset": 16 }, svg);
        var lbl = document.createElement("span");
        lbl.textContent = x.label || id2;
        chip.appendChild(lbl);
        crow.appendChild(chip);
        chips[id2] = { el: chip, run: run, fill: fill, tick: tick };
      });
      if (crow.children.length) {
        slide.appendChild(crow);
        // freeze every chip where the centered row laid it out — retiring
        // one must leave a gap, not re-center the survivors
        requestAnimationFrame(function () {
          var rw = crow.getBoundingClientRect();
          if (!rw.width) return;
          var pos = [], ci;
          for (ci = 0; ci < crow.children.length; ci++) {
            pos.push((crow.children[ci].getBoundingClientRect().left - rw.left) / rw.width * 100);
          }
          for (ci = 0; ci < crow.children.length; ci++) {
            var cel = crow.children[ci];
            cel.style.position = "absolute";
            cel.style.left = pos[ci] + "%";
            cel.style.top = "0";
          }
        });
      }
    }
    function retireChip(r, x0, top) {
      var c = chips[r.id];
      if (!c) return;
      delete chips[r.id];
      if (REDUCED) { c.el.parentNode.removeChild(c.el); return; }
      // the box checks...
      if (c.run.parentNode) c.run.parentNode.removeChild(c.run);
      c.fill.setAttribute("opacity", "1");
      c.tick.setAttribute("stroke-dashoffset", "0");
      // ...then the chip flies down to where its range just landed
      var sr = slide.getBoundingClientRect(), cr = c.el.getBoundingClientRect();
      var curX = cr.left - sr.left, curY = cr.top - sr.top, el = c.el;
      setTimeout(function () {
        el.style.position = "absolute"; // out of the flex row, onto the slide
        el.style.left = curX + "px";
        el.style.top = curY + "px";
        el.style.margin = "0";
        slide.appendChild(el);
        el.style.transition = "transform .55s cubic-bezier(.2,.7,.3,1), opacity .4s ease .25s";
        requestAnimationFrame(function () {
          el.style.transform = "translate(" + ((x0 / 100) * sr.width - curX) + "px," + ((top - 12) - curY) + "px)";
          el.style.opacity = "0";
        });
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 750);
      }, 350);
    }
    // lookahead for label placement: every point-pinned line's geometry is
    // known before anything draws (lines can't dodge — the dot pins them to
    // the curve — so the LABELS do the dodging, and they need to see lines
    // that haven't drawn yet)
    var knownLines = [];
    function planRange(r) {
      if (r.value != null) knownLines.push({ r: r, x0: pOf(r.lo), x1: pOf(r.hi), top: BASE_Y + yOf(r.value) - 2 });
    }
    ranges.forEach(planRange);
    function drawRange(r, animate) {
      if (!r.color) r.color = RANGE_COLS[rangeCount % RANGE_COLS.length];
      rangeCount++;
      var x0 = pOf(r.lo), x1 = pOf(r.hi);
      var hasPt = r.value != null;
      // line height: through the point-on-curve when there is one, else the
      // legacy terrace at the low end's curve height
      var top = hasPt ? BASE_Y + yOf(r.value) - 2 : BASE_Y + yOf(r.lo) + R_INSET;
      function collide(t, band) {
        for (var pi = 0; pi < placedLines.length; pi++) {
          var o = placedLines[pi];
          if (x0 < o.x1 && x1 > o.x0 && Math.abs(t - o.top) < band) return o;
        }
        return null;
      }
      var labelPos = "left";
      if (hasPt) {
        // a label zone is dirty when any OTHER known line crosses it; try
        // left, then above the right end, then below the right end
        var zoneDirty = function (zx0, zx1, zy0, zy1) {
          var all = knownLines.concat(placedLines.filter(function (o) { return !o.r; }));
          for (var zi = 0; zi < all.length; zi++) {
            var o = all[zi];
            if (o.r === r) continue;
            if (zx0 < o.x1 && zx1 > o.x0 && o.top + 4 >= zy0 && o.top <= zy1) return true;
          }
          return false;
        };
        var LAB_W = 17; // label x-extent, in track %
        if (!zoneDirty(x0, x0 + LAB_W, top - 13, top - 2)) labelPos = "left";
        else if (!zoneDirty(x1 - LAB_W, x1, top - 13, top - 2)) labelPos = "above-right";
        else labelPos = "below-right";
      } else {
        // terrace stagger: x-overlapping lines keep 18px vertical separation
        // (a label rides ~13px above every line). The newcomer walks UP when
        // its natural terrace is at or above the incumbent's (preserves the
        // value order) and DOWN otherwise; chart edges flip the direction.
        var BAND = 18, FLOOR_Y = SLIDE_H - BOTTOM - 4, CEIL_Y = BASE_Y + 2;
        var orig = top;
        if (collide(top, BAND)) {
          var walk = function (goUp) {
            var t = orig, h;
            while ((h = collide(t, BAND)) && t >= CEIL_Y && t <= FLOOR_Y) t = h.top + (goUp ? -BAND : BAND);
            return (t >= CEIL_Y && t <= FLOOR_Y) ? t : null;
          };
          var preferUp = orig <= collide(orig, BAND).top;
          var settled = walk(preferUp);
          if (settled === null) settled = walk(!preferUp);
          top = settled === null ? Math.max(CEIL_Y, Math.min(FLOOR_Y, orig)) : settled;
          labelPos = top < orig ? "above-right" : "below-right";
        }
      }
      placedLines.push({ x0: x0, x1: x1, top: top });
      var lab = null;
      if (r.label) {
        lab = document.createElement("span");
        lab.className = "zvs-rlabel";
        lab.style.color = r.color;
        lab.textContent = r.label;
        if (labelPos === "left") {
          lab.style.left = x0 + "%";
          lab.style.top = (top - 2) + "px";
        } else if (labelPos === "below-right") {
          lab.style.left = x1 + "%";
          lab.style.top = (top + 6) + "px";
          lab.style.transform = "translateX(-100%)";
        } else { // above-right
          lab.style.left = x1 + "%";
          lab.style.top = (top - 2) + "px";
          lab.style.transform = "translate(-100%,-100%)";
        }
        slide.appendChild(lab);
      }
      var tip = (r.label ? r.label + " — " : "") +
        (hasPt ? fmt(r.value) + " (range " + fmt(r.lo) + " – " + fmt(r.hi) + ")"
               : fmt(r.lo) + " – " + fmt(r.hi));
      var line = document.createElement("span");
      line.className = "zvs-range";
      line.style.left = x0 + "%";
      line.style.top = top + "px";
      line.style.background = r.color;
      line.title = tip;
      slide.appendChild(line);
      var dot = null;
      if (hasPt) {
        var cy = top + 2; // the line's center — and the curve edge at x(value)
        // the point estimate, pinned to the curve edge
        dot = document.createElement("span");
        dot.className = "zvs-rdot";
        dot.style.left = pOf(r.value) + "%";
        dot.style.top = cy + "px";
        dot.style.background = r.color;
        dot.title = tip;
        slide.appendChild(dot);
        registerPoint(r);
      }
      var w = (x1 - x0) + "%";
      var fades = [lab, dot];
      if (animate && !REDUCED) {
        line.style.width = "0%";
        if (lab) lab.style.transition = "opacity .4s ease .25s";
        fades.forEach(function (el) { if (el) el.style.opacity = "0"; });
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          line.style.width = w;
          // clear the inline 0 → each element eases to its stylesheet opacity
          fades.forEach(function (el) { if (el) el.style.opacity = ""; });
        }); });
      } else {
        line.style.width = w;
      }
      drawn.push({ r: r, lab: lab, dot: dot });
      updateUnion(r);
      retireChip(r, x0, top);
    }
    ranges.forEach(function (r) { drawRange(r, false); });
    // chart mode with a pinned domain but nothing arrived yet: the complete
    // range (headline + end labels) hides behind skeletons until the first
    // range lands — the range only exists once values do
    if (chartMode && uLo === null) {
      if (headlineEl) pendHead = pendify(headlineEl, true);
      container.querySelectorAll(".zvs-end b").forEach(function (b, bi) {
        pendEnds[bi] = pendify(b, false);
      });
    }

    // estimate-arrival wiring (e.g. the estimate tray's onArrive): draw the
    // new line in place when it fits the current scale; a range outside the
    // domain rebuilds the widget on the union scale (colors stay pinned —
    // defaults are written back onto each range as they're assigned)
    function addRange(r) {
      r = normRange(r);
      if (!single && r.lo >= vmin && r.hi <= vmax) {
        ranges.push(r);
        planRange(r);
        drawRange(r, true);
        return ret;
      }
      var next = {};
      for (var k in opts) if (k !== "anchors" && k !== "ranges") next[k] = opts[k];
      next.anchors = opts.anchors ? anchors.map(function (a) { return { value: a.value, label: a.label }; }) : [];
      next.ranges = ranges.concat([r]).map(function (q) {
        return { id: q.id, lo: q.lo, hi: q.hi, label: q.label, color: q.color };
      });
      if (pend) pend.stop();
      container.innerHTML = "";
      var inner = zbValueSlider(container, next);
      ret.anchors = inner.anchors;
      ret.ranges = inner.ranges;
      ret.snapTo = inner.snapTo;
      ret.addRange = inner.addRange;
      return ret;
    }

    /* ---- pending-offer mode (opts.pending, single anchor only): the chart
       waits for a second anchor — dimmed fill, marching dashed preview of
       the future two-anchor curve, pulsing landing dot, ticker, and the Z
       mark bobbing over the spot. deliver(anchor) (or the built-in demo
       timer) runs an animated arrival: the overlay lifts, this same chart's
       path morphs into the exact two-anchor curve, then the widget
       re-renders as a real range slider — pixel-identical, no flash. ---- */
    var pend = null;
    if (single && anchors.length === 1 && opts.pending) pend = buildPending();
    function buildPending() {
      var conf = opts.pending === true ? {} : opts.pending;
      var EXT = 26, S = .22, yFloor = CURVE_H - H_MIN;
      var ov = svgEl("svg", { "class": "zvs-wait", "aria-hidden": "true" }, slide);
      ov.style.height = (CURVE_H + EXT) + "px";
      var W = ov.clientWidth || slide.clientWidth || 600;
      var xo = .05 * W, xm = .95 * W, dxW = (xm - xo) / 2.2;
      var yO = EXT + yFloor;
      var gScrim = svgEl("g", {}, ov); // pending scrim: this chart isn't final
      svgEl("rect", { x: 0, y: EXT, width: W, height: CURVE_H, fill: "#0E1B33", opacity: .3 }, gScrim);
      var gDash = svgEl("g", {}, ov);  // future-curve preview + landing dot
      svgEl("path", { d: "M0 " + yO + " L" + xo + " " + yO +
        " C" + (xo + dxW) + " " + yO + " " + (xm - dxW) + " " + EXT + " " + xm + " " + EXT +
        " L" + W + " " + EXT,
        fill: "none", stroke: "#FFFFFF", "stroke-width": 2, opacity: .6,
        "stroke-dasharray": "5 6", "class": "zvs-march" }, gDash);
      svgEl("circle", { cx: xo, cy: yO, r: 4.5, fill: "#FFFFFF", "class": "zvs-gpulse" }, gDash);
      var gTop = svgEl("g", {}, ov);   // ticker + the mark
      // (the pulsing dot + the mark alone tag the landing spot — the old
      // "your offer lands here" annotation was retired 2026-07-28)
      // ticker: gradient-masked band right of the (inert) handle
      var mx0 = W * .5 + 22, mx1 = W - 4;
      var mdefs = svgEl("defs", {}, ov);
      var mg = svgEl("linearGradient", { id: "zvsTk" + id, gradientUnits: "userSpaceOnUse",
        x1: mx0, y1: 0, x2: mx1, y2: 0 }, mdefs);
      [[0, "#000"], [.08, "#fff"], [.92, "#fff"], [1, "#000"]].forEach(function (s) {
        svgEl("stop", { offset: s[0], "stop-color": s[1] }, mg);
      });
      svgEl("rect", { x: mx0, y: EXT + 40, width: mx1 - mx0, height: 16, fill: "url(#zvsTk" + id + ")" },
        svgEl("mask", { id: "zvsTkm" + id }, mdefs));
      var mq = svgEl("g", { mask: "url(#zvsTkm" + id + ")" }, gTop);
      var mts = [0, 1].map(function () { // two copies = seamless loop
        var t = svgEl("text", { x: mx0 + 8, y: EXT + 51, fill: "#FFFFFF", opacity: .85 }, mq);
        t.style.font = "600 10.5px Inter,system-ui,sans-serif";
        t.textContent = conf.ticker || "Awaiting your cash offer. Usually arrives in under a minute.";
        return t;
      });
      var mper = mts[0].getComputedTextLength() + 70;
      var piece = svgEl("g", {}, gTop); // the mark, monochrome, over the landing spot
      svgEl("polygon", { points: Z_W, fill: "#3BA4F4" }, piece);
      svgEl("polygon", { points: Z_B, fill: "#3BA4F4" }, piece);
      var yB = (EXT - 2) - 158 * S, lastBob = 0;
      function place(bob) {
        lastBob = bob;
        piece.setAttribute("transform", "translate(" + (xo - 100 * S) + " " + (yB + bob) + ") scale(" + S + ")");
      }
      place(0);
      var raf = 0, t0 = performance.now(), delivered = false, timer = 0;
      if (!REDUCED) (function loop(now) {
        var t = (now - t0) / 1000;
        place(2.8 * Math.sin(t * 2.4));
        var off = (t * 30) % mper;
        mts[0].setAttribute("x", mx1 - off);
        mts[1].setAttribute("x", mx1 - off + mper);
        raf = requestAnimationFrame(loop);
      })(t0);
      if (conf.demo) timer = setTimeout(function () { // stand-in for the API response
        deliver({ value: conf.demo.value, label: conf.demo.label });
      }, conf.demo.delay || (conf.demo.seconds || 6) * 1000);
      function stop() { cancelAnimationFrame(raf); clearTimeout(timer); }
      function finish(a) {
        var next = {};
        for (var k in opts) if (k !== "pending" && k !== "anchors") next[k] = opts[k];
        next.anchors = [
          { value: anchors[0].value, label: anchors[0].label },
          { value: +a.value, label: a.label || "" }
        ];
        container.innerHTML = "";
        container.classList.add("zvs-arrive"); // dots + end labels ease in
        var inner = zbValueSlider(container, next);
        setTimeout(function () { container.classList.remove("zvs-arrive"); }, 700);
        ret.anchors = inner.anchors; // graft the range instance onto the api
        ret.snapTo = inner.snapTo;
        if (typeof conf.onDeliver === "function") conf.onDeliver(inner);
      }
      function deliver(a) {
        if (delivered || !a) return;
        delivered = true; stop();
        if (REDUCED) { finish(a); return; }
        var xA = PAD * 10, xB = (100 - PAD) * 10, dxT = (xB - xA) / 2.2;
        var dived = lastBob, swapped = false, m0 = performance.now();
        function ph(t, lo, hi) { return Math.max(0, Math.min(1, (t - lo) / (hi - lo))); }
        (function step(now) {
          var t = now - m0;
          var p1 = easeInOut(ph(t, 0, 350));     // wake: scrim + annotations lift
          gScrim.setAttribute("opacity", 1 - p1);
          gTop.setAttribute("opacity", 1 - p1);
          place(dived + 26 * p1);                // the mark dives to its spot
          var pm = easeInOut(ph(t, 250, 950)), yL = yFloor * pm; // chart reshapes
          var d2 = "M0 " + CURVE_H + " L0 " + yL + " L" + xA + " " + yL +
                   " C" + (xA + dxT) + " " + yL + " " + (xB - dxT) + " 0 " + xB + " 0" +
                   " L1000 0 L1000 " + CURVE_H + " Z";
          trackPath.setAttribute("d", d2);
          fillPath.setAttribute("d", d2);
          var wc = 1000 - 500 * pm;              // fill recedes to the midpoint
          clipRect.setAttribute("width", wc);
          grad.setAttribute("x2", wc);
          gDash.setAttribute("opacity", 1 - ph(t, 850, 1150)); // preview fades as the real curve lands
          if (!swapped && t >= 850 && headlineEl) {
            swapped = true;
            headlineEl.style.transition = "opacity .16s";
            headlineEl.style.opacity = "0";
            setTimeout(function () {
              var lo = Math.min(anchors[0].value, +a.value), hi = Math.max(anchors[0].value, +a.value);
              setHeadline(fmt(lo) + " – " + fmt(hi), rangeLabel);
              headlineEl.style.opacity = "1";
            }, 170);
          }
          if (t < 1200) requestAnimationFrame(step);
          else finish(a);
        })(m0);
      }
      return { deliver: deliver, stop: stop };
    }

    var ret = {
      element: container,
      anchors: anchors,
      ranges: ranges,
      snapTo: snapTo,
      addRange: function (r) { return addRange(r); }, // estimate-arrival wiring
      deliver: function (a) { if (pend) pend.deliver(a); }, // the arrival (API callback)
      destroy: function () { if (pend) pend.stop(); container.innerHTML = ""; }
    };
    return ret;
  }

  global.zbValueSlider = zbValueSlider;
})(window);
