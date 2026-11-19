/* Echolocation: a ping sends a ring out from a point. Each .echo element answers
   after a delay proportional to its distance. Nothing is hidden by this; it only adds emphasis.
   The animation loop runs only while rings are alive, so the page idles at zero cost. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cave = document.getElementById("cave");
  var ctx = cave && cave.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var rings = [];
  var raf = 0;
  var SPEED = 0.9;           /* px per ms, visual speed of the ring */
  var MAX_R = 0;

  function sizeCave() {
    if (!cave) return;
    cave.width = Math.round(window.innerWidth * dpr);
    cave.height = Math.round(window.innerHeight * dpr);
    MAX_R = Math.hypot(window.innerWidth, window.innerHeight);
  }

  function frame(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    rings = rings.filter(function (r) { return (now - r.t0) * SPEED < MAX_R; });
    rings.forEach(function (r) {
      var rad = (now - r.t0) * SPEED;
      var fade = Math.max(0, 1 - rad / MAX_R);
      for (var i = 0; i < 3; i++) {            /* a call is a few close pulses */
        var rr = rad - i * 14;
        if (rr <= 0) continue;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,45,45," + (0.5 * fade * (1 - i * 0.3)).toFixed(3) + ")";
        ctx.lineWidth = 1.6 - i * 0.4;
        ctx.stroke();
      }
    });
    if (rings.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  var targets = [];
  function collect() {
    targets = Array.prototype.slice.call(document.querySelectorAll(".echo")).map(function (el) {
      var tag = el.querySelector(".tag-echo");
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "tag-echo";
        tag.setAttribute("aria-hidden", "true");
        el.appendChild(tag);
      }
      return { el: el, tag: tag };
    });
  }

  function ping(x, y) {
    if (reduce || !ctx) return;
    rings.push({ x: x, y: y, t0: performance.now() });
    if (!raf) raf = requestAnimationFrame(frame);
    targets.forEach(function (t) {
      var b = t.el.getBoundingClientRect();
      if (b.bottom < -200 || b.top > window.innerHeight + 200) return;   /* only what is near the view */
      var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      var d = Math.hypot(cx - x, cy - y);
      var delay = d / SPEED;
      /* physical readout: 100 px = 1 m, sound at 343 m/s, round trip */
      var ms = (2 * (d / 100) / 343) * 1000;
      window.setTimeout(function () {
        t.tag.textContent = "echo " + ms.toFixed(1) + " ms";
        t.el.classList.add("hit");
        window.setTimeout(function () { t.el.classList.remove("hit"); }, 1100);
      }, delay);
    });
  }

  document.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a,button,input,textarea,select,summary")) return;
    ping(e.clientX, e.clientY);
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      ping(window.innerWidth / 2, window.innerHeight * 0.4);
    }
  });

  /* scroll reveal, no motion needed for content to be present */
  var rv = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    rv.forEach(function (n) { io.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.add("in"); });
  }

  /* spectrogram of a bat hunt: search calls, approach, terminal buzz.
     Drawn once per resize; static, so no ongoing cost. */
  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function drawSpec() {
    var c = document.getElementById("spec");
    if (!c) return;
    var w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#070000"; g.fillRect(0, 0, w, h);
    var r = rand(42);
    for (var i = 0; i < 700; i++) {                     /* background noise floor */
      g.fillStyle = "rgba(255,45,45," + (r() * 0.07).toFixed(3) + ")";
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
    g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1;
    for (var k = 1; k < 5; k++) { g.beginPath(); g.moveTo(0, h * k / 5); g.lineTo(w, h * k / 5); g.stroke(); }
    /* call timeline: slow and long at first, faster and shorter later, buzz at the end */
    var x = w * 0.02, i2 = 0;
    while (x < w * 0.99) {
      var p = x / w;
      var gap = p < 0.34 ? 62 : p < 0.7 ? 62 - (p - 0.34) / 0.36 * 44 : 7;
      var len = p < 0.34 ? 30 : p < 0.7 ? 30 - (p - 0.34) / 0.36 * 12 : 6;
      var topY = p < 0.7 ? h * 0.12 : h * 0.3;           /* buzz sits lower and shorter */
      var botY = p < 0.7 ? h * 0.62 : h * 0.72;
      var wob = (r() - 0.5) * 4;
      for (var layer = 0; layer < 3; layer++) {          /* fundamental plus faint harmonics */
        var off = layer * h * 0.13;
        g.beginPath();
        g.moveTo(x, topY - off * (p < 0.7 ? 0.5 : 0.2) + wob);
        g.bezierCurveTo(x + len * 0.25, topY + (botY - topY) * 0.55 - off * 0.3,
                        x + len * 0.55, botY - off * 0.2, x + len, botY + wob - off * 0.1);
        g.strokeStyle = "rgba(255,45," + 45 + "," + (layer === 0 ? 0.95 : layer === 1 ? 0.4 : 0.18) + ")";
        g.lineWidth = layer === 0 ? 2 : 1.2;
        g.shadowColor = "rgba(255,45,45,.7)"; g.shadowBlur = layer === 0 ? 8 : 0;
        g.stroke();
      }
      g.shadowBlur = 0;
      x += gap; i2++;
    }
    g.fillStyle = "rgba(236,227,227,.55)"; g.font = "11px 'Fira Code',monospace";
    g.fillText("kHz", 8, 14);
    g.fillText("time", w - 38, h - 8);
  }

  function init() {
    sizeCave(); collect(); drawSpec();
    if (!reduce) {
      /* one call on load so the visitor sees what the page does */
      window.setTimeout(function () { ping(window.innerWidth * 0.5, window.innerHeight * 0.36); }, 900);
    }
  }
  var rt = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () { sizeCave(); drawSpec(); }, 150);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSpec);
})();
