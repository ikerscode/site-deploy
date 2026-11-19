/* One motif: echolocation. A call sends a ring out from a point and nearby panels answer with a brief
   highlight, later for the ones further away. Nothing is hidden by this, it is emphasis only.
   It runs from a real button (no global key shortcut, no tap-anywhere), can be switched off, and is
   off under prefers-reduced-motion. The animation loop only runs while a ring is alive. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.remove("no-js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cave = document.getElementById("cave");
  var ctx = cave && cave.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var rings = [], raf = 0, MAX_R = 0, SPEED = 0.9;
  var effects = !reduce;

  try { if (window.sessionStorage.getItem("fx") === "off") effects = false; } catch (e) { /* storage blocked */ }

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
      var rad = (now - r.t0) * SPEED, fade = Math.max(0, 1 - rad / MAX_R);
      for (var i = 0; i < 2; i++) {
        var rr = rad - i * 16;
        if (rr <= 0) continue;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,69,69," + (0.34 * fade * (1 - i * 0.4)).toFixed(3) + ")";
        ctx.lineWidth = 1.4 - i * 0.4;
        ctx.stroke();
      }
    });
    if (rings.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  var targets = [];
  function collect() { targets = Array.prototype.slice.call(document.querySelectorAll(".echo")); }

  function ping(x, y) {
    if (!effects || !ctx) return;
    rings.push({ x: x, y: y, t0: performance.now() });
    if (!raf) raf = requestAnimationFrame(frame);
    targets.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.bottom < -200 || b.top > window.innerHeight + 200) return;
      var d = Math.hypot(b.left + b.width / 2 - x, b.top + b.height / 2 - y);
      window.setTimeout(function () {
        el.classList.add("hit");
        window.setTimeout(function () { el.classList.remove("hit"); }, 1000);
      }, d / SPEED);
    });
  }

  var pingBtn = document.getElementById("ping-btn");
  var fxBtn = document.getElementById("fx-btn");
  function syncFx() {
    root.classList.toggle("fx-off", !effects);
    if (fxBtn) {
      fxBtn.setAttribute("aria-pressed", effects ? "true" : "false");
      fxBtn.textContent = effects ? "Effects: on" : "Effects: off";
    }
    if (pingBtn) pingBtn.disabled = !effects;
  }
  if (pingBtn) pingBtn.addEventListener("click", function () {
    var b = pingBtn.getBoundingClientRect();
    ping(b.left + b.width / 2, b.top + b.height / 2);
  });
  if (fxBtn) fxBtn.addEventListener("click", function () {
    effects = !effects;
    try { window.sessionStorage.setItem("fx", effects ? "on" : "off"); } catch (e) { /* ignore */ }
    syncFx();
  });

  var rv = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.06 });
    rv.forEach(function (n) { io.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.add("in"); });
  }

  /* Spectrogram of a bat hunt: search calls, approach, terminal buzz. Drawn once per resize. */
  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function drawSpec() {
    var c = document.getElementById("spec");
    if (!c) return;
    var w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#09090b"; g.fillRect(0, 0, w, h);
    var r = rand(42);
    for (var i = 0; i < 600; i++) {
      g.fillStyle = "rgba(255,255,255," + (r() * 0.06).toFixed(3) + ")";
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
    g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1;
    for (var k = 1; k < 5; k++) { g.beginPath(); g.moveTo(0, h * k / 5); g.lineTo(w, h * k / 5); g.stroke(); }
    var x = w * 0.02;
    while (x < w * 0.99) {
      var p = x / w;
      var gap = p < 0.34 ? 62 : p < 0.7 ? 62 - (p - 0.34) / 0.36 * 44 : 7;
      var len = p < 0.34 ? 30 : p < 0.7 ? 30 - (p - 0.34) / 0.36 * 12 : 6;
      var topY = p < 0.7 ? h * 0.12 : h * 0.3, botY = p < 0.7 ? h * 0.62 : h * 0.72;
      var wob = (r() - 0.5) * 4;
      for (var layer = 0; layer < 3; layer++) {
        var off = layer * h * 0.13;
        g.beginPath();
        g.moveTo(x, topY - off * (p < 0.7 ? 0.5 : 0.2) + wob);
        g.bezierCurveTo(x + len * 0.25, topY + (botY - topY) * 0.55 - off * 0.3,
                        x + len * 0.55, botY - off * 0.2, x + len, botY + wob - off * 0.1);
        g.strokeStyle = "rgba(255,69,69," + (layer === 0 ? 0.95 : layer === 1 ? 0.38 : 0.16) + ")";
        g.lineWidth = layer === 0 ? 2 : 1.2;
        g.stroke();
      }
      x += gap;
    }
    g.fillStyle = "rgba(236,236,240,.6)"; g.font = "11px 'Fira Code',monospace";
    g.fillText("kHz", 8, 14);
    g.fillText("time", w - 38, h - 8);
  }

  function init() {
    sizeCave(); collect(); drawSpec(); syncFx();
    if (effects) window.setTimeout(function () { ping(window.innerWidth * 0.5, window.innerHeight * 0.34); }, 900);
  }
  var rt = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () { sizeCave(); drawSpec(); }, 150);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSpec);
})();
