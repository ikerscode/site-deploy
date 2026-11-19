/* One illustration, drawn once: the bat-hunt spectrogram in "How I work". It is static, nothing moves.
   Search calls are slow and long, approach calls get faster and shorter, the terminal buzz is rapid.
   Redrawn only on resize or when the colour scheme changes. No axes or scale: it is an illustration. */
(function () {
  "use strict";
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var canvas = document.getElementById("spec2");

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function rgba(hex, a) {
    var h = hex.replace("#", "");
    return "rgba(" + parseInt(h.substr(0, 2), 16) + "," + parseInt(h.substr(2, 2), 16) + "," + parseInt(h.substr(4, 2), 16) + "," + a + ")";
  }

  function draw() {
    if (!canvas) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = css("--exhibit"), ink = css("--ink"), muted = css("--muted"), accent = css("--accent");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var r = rand(42);
    for (var i = 0; i < 450; i++) {
      g.fillStyle = rgba(ink, r() * 0.05);
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
    /* phase boundaries, matching the labels above and below the picture */
    g.strokeStyle = rgba(muted, 0.45); g.lineWidth = 1; g.setLineDash([3, 4]);
    [0.34, 0.7].forEach(function (p) { g.beginPath(); g.moveTo(Math.round(w * p) + 0.5, 0); g.lineTo(Math.round(w * p) + 0.5, h); g.stroke(); });
    g.setLineDash([]);
    var x = w * 0.02;
    while (x < w * 0.99) {
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
  }

  var rt = 0;
  window.addEventListener("resize", function () { window.clearTimeout(rt); rt = window.setTimeout(draw, 150); });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", draw);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw); else draw();
})();
