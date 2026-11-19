/* The only moving element: the bat-call spectrogram in the hero. It draws once on load (about 1.2 s)
   and the "Send a call" button replays it. The second spectrogram in "How I work" is static.
   Reduced motion: the final frame is drawn at once and the button is hidden by CSS.
   The animation loop only runs while a draw is in progress, and stops if the tab is hidden. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function rgba(hex, a) {
    var h = hex.replace("#", "");
    return "rgba(" + parseInt(h.substr(0, 2), 16) + "," + parseInt(h.substr(2, 2), 16) + "," + parseInt(h.substr(4, 2), 16) + "," + a + ")";
  }

  /* Draw the hunt from the left edge up to progress (0..1). Search calls are slow and long, approach calls
     get faster and shorter, the terminal buzz is rapid, short and lower. */
  function draw(canvas, progress) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = css("--exhibit"), ink = css("--ink"), muted = css("--muted"), accent = css("--accent");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var r = rand(42);
    for (var i = 0; i < 500; i++) {
      g.fillStyle = rgba(ink.length === 7 ? ink : "#888888", r() * 0.05);
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
    g.strokeStyle = rgba(muted.length === 7 ? muted : "#888888", 0.18); g.lineWidth = 1;
    for (var k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, h * k / 4); g.lineTo(w, h * k / 4); g.stroke(); }
    var limit = w * progress, x = w * 0.02;
    while (x < w * 0.99 && x <= limit) {
      var p = x / w;
      var gap = p < 0.34 ? 62 : p < 0.7 ? 62 - (p - 0.34) / 0.36 * 44 : 7;
      var len = p < 0.34 ? 30 : p < 0.7 ? 30 - (p - 0.34) / 0.36 * 12 : 6;
      var topY = p < 0.7 ? h * 0.12 : h * 0.3, botY = p < 0.7 ? h * 0.62 : h * 0.72;
      var wob = (r() - 0.5) * 3;
      for (var layer = 0; layer < 3; layer++) {
        var off = layer * h * 0.13;
        g.beginPath();
        g.moveTo(x, topY - off * (p < 0.7 ? 0.5 : 0.2) + wob);
        g.bezierCurveTo(x + len * 0.25, topY + (botY - topY) * 0.55 - off * 0.3,
                        x + len * 0.55, botY - off * 0.2, x + len, botY + wob - off * 0.1);
        g.strokeStyle = rgba(accent, layer === 0 ? 0.95 : layer === 1 ? 0.4 : 0.18);
        g.lineWidth = layer === 0 ? 1.8 : 1.1;
        g.stroke();
      }
      x += gap;
    }
    g.fillStyle = muted; g.font = "11px 'JetBrains Mono',monospace";
    g.fillText("kHz", 8, 14);
    g.fillText("time", w - 36, h - 8);
  }

  var hero = document.getElementById("spec");
  var still = document.getElementById("spec2");
  var raf = 0;

  function play() {
    if (!hero) return;
    if (reduce) { draw(hero, 1); return; }
    if (raf) cancelAnimationFrame(raf);
    var t0 = null, dur = 1200;
    function step(ts) {
      if (document.hidden) { raf = 0; draw(hero, 1); return; }
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      draw(hero, p);
      raf = p < 1 ? requestAnimationFrame(step) : 0;
    }
    raf = requestAnimationFrame(step);
  }

  function renderStill() { if (hero && !raf) draw(hero, 1); if (still) draw(still, 1); }

  var btn = document.getElementById("send");
  if (btn) btn.addEventListener("click", play);

  var rt = 0;
  window.addEventListener("resize", function () { window.clearTimeout(rt); rt = window.setTimeout(renderStill, 150); });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", renderStill);
  }

  function init() { if (still) draw(still, 1); play(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderStill);
})();
