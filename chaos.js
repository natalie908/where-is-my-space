/* Scéna chaos – kolečka na canvasu. Popisky jsou v content.js (OBSAH.chaos). */
(function () {
  "use strict";

  // signální barvy + barva textu pro dobrý kontrast
  var COLORS = [
    { fill: "#ff1744", text: "#fff" }, // neon červená
    { fill: "#ffea00", text: "#000" }, // žlutá
    { fill: "#00e5ff", text: "#000" }, // azurová
    { fill: "#ff00d4", text: "#fff" }, // magenta
    { fill: "#39ff14", text: "#000" }, // zelená
  ];

  // velikost = kolik pozornosti to bere (poloměr jako podíl velikosti obrazovky)
  var SIZES = {
    velka:   { k: 0.115, min: 64, speed: [0.12, 0.22] },
    stredni: { k: 0.078, min: 48, speed: [0.18, 0.32] },
    mala:    { k: 0.048, min: 36, speed: [0.22, 0.36] },
  };

  var T = {
    firstCycle: 3.5,      // s po otevření
    gap: [1.5, 3.5],      // pauza mezi cykly (celý cyklus pak trvá ~8–12 s)
    approach: 2.2,        // malé kolečko pluje do středu
    hold: 3,              // malé kolečko ve středu
    occupy: 3.2,          // velké kolečko zabírá střed
  };

  var canvas, ctx, cfg, raf = null, last = 0;
  var W = 0, H = 0, S = 0, dpr = 1;
  var circles = [];
  var seq = null;
  var reduced = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeIn(t) { return t * t * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- příprava ---------- */

  function build() {
    circles = [];
    var i = 0;
    ["velka", "stredni", "mala"].forEach(function (size) {
      (cfg[size] || []).forEach(function (item) {
        var col = COLORS[i++ % COLORS.length];
        var sp = SIZES[size].speed;
        circles.push({
          text: item.text, naraz: !!item.naraz, size: size,
          fill: col.fill, color: col.text,
          speedK: rand(sp[0], sp[1]),
          ang: rand(0, Math.PI * 2), spin: 0,
          x: 0, y: 0, vx: 0, vy: 0, r: 0,
          mode: "free", bump: 0,
        });
      });
    });
    resize();
    circles.forEach(function (c) {
      c.x = rand(c.r, W - c.r);
      c.y = rand(c.r, H - c.r);
      setVel(c, c.ang, c.speed);
    });
  }

  function setVel(c, ang, speed) {
    c.vx = Math.cos(ang) * speed;
    c.vy = Math.sin(ang) * speed;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.sqrt(W * H);
    var slow = reduced ? 0.25 : 1;
    circles.forEach(function (c) {
      var s = SIZES[c.size];
      c.r = Math.min(Math.max(s.k * S, s.min), Math.min(W, H) * 0.3);
      var oldSpeed = c.speed || 0;
      c.speed = c.speedK * S * slow;
      if (oldSpeed && c.mode === "free") {
        var f = c.speed / oldSpeed; c.vx *= f; c.vy *= f;
      }
      c.x = clamp(c.x, c.r, Math.max(c.r, W - c.r));
      c.y = clamp(c.y, c.r, Math.max(c.r, H - c.r));
      layoutText(c);
    });
  }

  // zalomí popisek tak, aby se vešel do kolečka
  function layoutText(c) {
    var words = c.text.split(/\s+/);
    var maxW = c.r * 1.5;
    for (var f = Math.max(11, c.r * 0.3); f >= 8; f -= 0.5) {
      ctx.font = "600 " + f + "px Inter, system-ui, -apple-system, sans-serif";
      var lines = [], line = "", ok = true;
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width <= maxW) { line = test; continue; }
        if (!line) { ok = false; break; }
        lines.push(line); line = words[i];
        if (ctx.measureText(line).width > maxW) { ok = false; break; }
      }
      if (!ok) continue;
      lines.push(line);
      if (lines.length * f * 1.18 <= c.r * 1.3) { c.fs = f; c.lines = lines; return; }
    }
    c.fs = 8; c.lines = [c.text];
  }

  /* ---------- scénář: zajímavé do středu → náraz → velké zabere střed ---------- */

  function newSeq(delay) { seq = { phase: "idle", t: 0, wait: delay }; }

  function stepSeq(dt) {
    seq.t += dt;
    var cx = W / 2, cy = H / 2;
    var s = seq.small, b = seq.big, p;

    switch (seq.phase) {
      case "idle":
        if (seq.t < seq.wait) return;
        var smalls = circles.filter(function (c) { return c.size === "mala" && c.mode === "free"; });
        var bigs = circles.filter(function (c) { return c.size === "velka" && c.naraz && c.mode === "free"; });
        if (!bigs.length) bigs = circles.filter(function (c) { return c.size === "velka" && c.mode === "free"; });
        if (!smalls.length || !bigs.length) { seq.t = 0; seq.wait = 1; return; }
        s = seq.small = pick(smalls);
        b = seq.big = pick(bigs);
        s.mode = "scripted"; s.fx = s.x; s.fy = s.y;
        seq.phase = "approach"; seq.t = 0;
        return;

      case "approach":
        p = Math.min(1, seq.t / (reduced ? T.approach * 2 : T.approach));
        s.x = s.fx + (cx - s.fx) * easeInOut(p);
        s.y = s.fy + (cy - s.fy) * easeInOut(p);
        if (p >= 1) { seq.phase = "hold"; seq.t = 0; }
        return;

      case "hold":
        s.x = cx; s.y = cy;
        if (seq.t < T.hold) return;
        b.mode = "scripted"; b.fx = b.x; b.fy = b.y;
        seq.t = 0;
        if (reduced) {
          // bez nárazu: zajímavé tiše odpluje, velké pomalu připluje
          s.mode = "free";
          setVel(s, rand(0, Math.PI * 2), s.speed);
          seq.phase = "glide";
        } else {
          var dist = Math.hypot(cx - b.x, cy - b.y);
          seq.chargeDur = clamp(dist / (1.3 * S), 0.55, 1.1);
          seq.hit = false;
          seq.phase = "charge";
        }
        return;

      case "charge":
        p = Math.min(1, seq.t / seq.chargeDur);
        b.x = b.fx + (cx - b.fx) * easeIn(p);
        b.y = b.fy + (cy - b.fy) * easeIn(p);
        if (!seq.hit && Math.hypot(s.x - b.x, s.y - b.y) < b.r + s.r * 0.8) {
          seq.hit = true;
          var ang = Math.atan2(s.y - b.y, s.x - b.x);
          if (Math.hypot(s.y - b.y, s.x - b.x) < 1) ang = Math.atan2(cy - b.fy, cx - b.fx);
          ang += rand(-0.35, 0.35);
          s.mode = "knocked";
          setVel(s, ang, 1.7 * S);
          b.bump = 1;
        }
        if (p >= 1) { seq.phase = "occupy"; seq.t = 0; }
        return;

      case "glide":
        p = Math.min(1, seq.t / 4);
        b.x = b.fx + (cx - b.fx) * easeInOut(p);
        b.y = b.fy + (cy - b.fy) * easeInOut(p);
        if (p >= 1) { seq.phase = "occupy"; seq.t = 0; }
        return;

      case "occupy":
        var shake = reduced ? 0 : 2.2 * Math.max(0, 1 - seq.t / T.occupy);
        b.x = cx + rand(-shake, shake);
        b.y = cy + rand(-shake, shake);
        if (seq.t < T.occupy) return;
        b.mode = "free";
        setVel(b, rand(0, Math.PI * 2), b.speed);
        newSeq(rand(T.gap[0], T.gap[1]));
        return;
    }
  }

  /* ---------- pohyb ---------- */

  function move(c, dt) {
    if (c.mode === "scripted") return;

    if (c.mode === "knocked") {
      var k = Math.exp(-1.3 * dt);
      c.vx *= k; c.vy *= k;
      var v = Math.hypot(c.vx, c.vy);
      if (v <= c.speed) {
        c.mode = "free";
        var f = c.speed / (v || 1); c.vx *= f; c.vy *= f;
      }
    } else {
      // náhodné kličkování
      var jitter = reduced ? 0.6 : 3.5;
      var maxSpin = reduced ? 0.25 : 1.6;
      c.spin = clamp(c.spin + rand(-1, 1) * jitter * dt, -maxSpin, maxSpin);
      var a = c.spin * dt, cos = Math.cos(a), sin = Math.sin(a);
      var vx = c.vx * cos - c.vy * sin;
      c.vy = c.vx * sin + c.vy * cos;
      c.vx = vx;
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.x < c.r)     { c.x = c.r;     c.vx = Math.abs(c.vx); }
    if (c.x > W - c.r) { c.x = W - c.r; c.vx = -Math.abs(c.vx); }
    if (c.y < c.r)     { c.y = c.r;     c.vy = Math.abs(c.vy); }
    if (c.y > H - c.r) { c.y = H - c.r; c.vy = -Math.abs(c.vy); }
  }

  /* ---------- kreslení ---------- */

  function draw(c) {
    var r = c.r * (1 + 0.08 * c.bump);
    ctx.save();
    ctx.shadowColor = c.fill;
    ctx.shadowBlur = r * 0.35;
    ctx.fillStyle = c.fill;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = c.color;
    ctx.font = "600 " + c.fs + "px Inter, system-ui, -apple-system, sans-serif";
    var lh = c.fs * 1.18;
    var y0 = c.y - (c.lines.length - 1) * lh / 2;
    for (var i = 0; i < c.lines.length; i++) ctx.fillText(c.lines[i], c.x, y0 + i * lh);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;

    stepSeq(dt);
    circles.forEach(function (c) {
      move(c, dt);
      c.bump *= Math.exp(-4 * dt);
    });

    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // pořadí: běžná kolečka, odražené zajímavé, pak to, co je ve středu, navrch
    var order = circles.filter(function (c) { return c.mode === "free"; })
      .concat(circles.filter(function (c) { return c.mode === "knocked"; }))
      .concat(seq.small && seq.small.mode === "scripted" ? [seq.small] : [])
      .concat(seq.big && seq.big.mode === "scripted" ? [seq.big] : []);
    order.forEach(draw);

    raf = requestAnimationFrame(frame);
  }

  /* ---------- API ---------- */

  function onResize() { resize(); }

  function start(cnv, config) {
    stop();
    canvas = cnv;
    ctx = canvas.getContext("2d");
    cfg = config;
    reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    build();
    newSeq(T.firstCycle);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (raf) resize(); });
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    window.removeEventListener("resize", onResize);
  }

  window.Chaos = { start: start, stop: stop };
})();
