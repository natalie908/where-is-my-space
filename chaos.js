/*
  Scéna chaos – generativní „neuronová síť“ na canvasu.
  Barvy, velikosti teček a popisky: content.js (OBSAH.chaos).
  Technické ladění: CONFIG hned níže.
*/
(function () {
  "use strict";

  var CONFIG = {
    uzlyDesktop: 2200,   // max. počet větví/uzlů na velké obrazovce
    uzlyMobil: 1400,     // max. počet větví/uzlů na mobilu
    korenu: 28,          // kolik hlavních větví vyrůstá ze středu
    vetveni: 0.55,       // šance, že se větev rozdvojí (0–1) – víc = hustší síť
    uhel: 0.55,          // max. odklon nové větve (radiány)
    zakriveni: 0.25,     // jak moc jsou větve prohnuté (0 = rovné)
    rustRychlost: 70,    // rychlost dorůstání (px/s)
    rotace: 0.012,       // rychlost otáčení celé sítě (rad/s)
    signaly: 50,         // kolik světelných signálů běží najednou (mobil polovina)
    signalRychlost: 140, // rychlost signálů (px/s)
    pulz: 0.12,          // síla pulzování (0–1)
    pauza: [1.5, 3.5],   // pauza mezi příběhy (s); celý příběh trvá ~10 s
    maxTextura: 2600,    // max. rozlišení vrstvy sítě v px (paměť / ostrost)
  };

  var STEPS = 6; // na kolik úseků se každá křivka dělí

  var canvas, ctx, cfg, raf = null, last = 0, time = 0, pulseT = 0;
  var W = 0, H = 0, dpr = 1, R = 0, offScale = 1, sc = 1;
  var linesCv, dotsCv, lctx, dctx;
  var types = {}, typeKeys = [];
  var segs = [], grown = [], G = 0, extraBudget = 0;
  var rot = 0, ts = 1, tsTarget = 1, tsRate = 1.5, netAlpha = 1, netAlphaTarget = 1, growBoost = 0;
  var signals = [], signalTarget = 0;
  var center = { c: [255, 255, 255], a: 0.12, tc: [255, 255, 255], ta: 0.12 };
  var story = null, storyIdx = { zelene: 0, cervene: 0 };
  var reduced = false;
  var ui = null;
  var pointer = { x: 0, y: 0, has: false }, hover = null, tapUntil = 0, frameNo = 0;
  var perf = { n: 0, sum: 0, checked: 0 };

  /* ---------- pomocné ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function hexRgb(h) { var n = parseInt(h.replace("#", ""), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function lerpAngle(a, b, t) {
    var d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + d * t;
  }

  function setupTypes() {
    types = {};
    typeKeys = Object.keys(cfg.typy);
    typeKeys.forEach(function (k) {
      var t = cfg.typy[k];
      types[k] = { rgb: hexRgb(t.barva), size: t.velikost, weight: t.cetnost, labels: t.popisky && t.popisky.length ? t.popisky : [k] };
    });
  }

  function pickType(allowGreen) {
    var keys = typeKeys.filter(function (k) { return allowGreen || k !== "zelena"; });
    var total = keys.reduce(function (s, k) { return s + types[k].weight; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < keys.length; i++) { r -= types[keys[i]].weight; if (r <= 0) return keys[i]; }
    return keys[0];
  }

  /* ---------- plátna ---------- */

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    R = Math.hypot(W, H) / 2 * 1.04;
    offScale = Math.min(dpr, CONFIG.maxTextura / (2 * R));
    var size = Math.ceil(2 * R * offScale);
    linesCv = linesCv || document.createElement("canvas");
    dotsCv = dotsCv || document.createElement("canvas");
    linesCv.width = linesCv.height = dotsCv.width = dotsCv.height = size;
    lctx = linesCv.getContext("2d");
    dctx = dotsCv.getContext("2d");
    [lctx, dctx].forEach(function (c) { c.setTransform(offScale, 0, 0, offScale, R * offScale, R * offScale); });
    lctx.lineCap = "butt";
    lctx.lineJoin = "round";
  }

  /* ---------- generování sítě ---------- */

  function makeSeg(parent, x0, y0, a, len, depth, type, start) {
    var x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    var bend = rand(-CONFIG.zakriveni, CONFIG.zakriveni) * len;
    var cx = (x0 + x1) / 2 - Math.sin(a) * bend, cy = (y0 + y1) / 2 + Math.cos(a) * bend;
    var pts = [], cum = [0];
    for (var i = 0; i <= STEPS; i++) {
      var t = i / STEPS, u = 1 - t;
      pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
      if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    var L = cum[STEPS];
    return {
      pts: pts, cum: cum, len: L, a: Math.atan2(y1 - cy, x1 - cx), x1: x1, y1: y1,
      depth: depth, parent: parent, type: type,
      width: Math.max(0.5, 1.5 - depth * 0.09),
      alpha: Math.max(0.28, 0.62 - depth * 0.025),
      start: start != null ? start : (parent ? parent.start + parent.dur : rand(0, 0.4)),
      dur: L / CONFIG.rustRychlost,
      drawn: 0, done: false, leaf: true, node: null,
    };
  }

  function makeNode(s) {
    var t = s.type;
    if (s.leaf && Math.random() * 100 < types.zelena.weight) t = "zelena";
    s.node = { x: s.x1, y: s.y1, type: t, r: types[t].size * (s.leaf ? 1 : 0.55), seg: s, label: pick(types[t].labels) };
  }

  function generate() {
    segs = []; grown = [];
    var max = W * H > 700000 ? CONFIG.uzlyDesktop : CONFIG.uzlyMobil;
    extraBudget = Math.round(max * 0.35);
    var L0 = R / 5.2, queue = [], n = CONFIG.korenu;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + rand(-0.15, 0.15);
      queue.push(makeSeg(null, Math.cos(a) * 4, Math.sin(a) * 4, a, L0 * rand(0.6, 1.1), 0, pickType(false)));
    }
    while (queue.length && segs.length < max) {
      var s = queue.shift();
      segs.push(s);
      if (Math.hypot(s.x1, s.y1) > R || s.depth > 16) continue;
      var kids = s.depth < 2 ? 2 : (Math.random() < CONFIG.vetveni ? 2 : 1);
      if (s.depth > 3 && Math.random() < 0.07) kids = 0;
      for (var k = 0; k < kids; k++) {
        var ang = s.a + (kids === 2 ? (k ? 1 : -1) * rand(0.15, CONFIG.uhel) : rand(-CONFIG.uhel, CONFIG.uhel) * 0.6);
        ang = lerpAngle(ang, Math.atan2(s.y1, s.x1), 0.12);
        var type = Math.random() < 0.85 ? s.type : pickType(false);
        queue.push(makeSeg(s, s.x1, s.y1, ang, Math.max(R * 0.02, s.len * rand(0.8, 0.95)), s.depth + 1, type));
      }
    }
    segs.forEach(function (s) { if (s.parent) s.parent.leaf = false; });
    segs.forEach(makeNode);
  }

  // při „nárazu“ síť zhoustne – z existujících uzlů vyraší nové výhonky
  function sprout(count) {
    if (reduced) return;
    for (var i = 0; i < count && extraBudget > 0 && grown.length; i++) {
      var n = pick(grown), p = n.seg;
      if (p.depth < 2) continue;
      var type = Math.random() < 0.5 ? "cervena" : p.type;
      var s = makeSeg(p, n.x, n.y, p.a + rand(-1, 1), p.len * rand(0.4, 0.8), p.depth + 1, type, G + rand(0, 0.8));
      s.alpha = Math.min(0.7, s.alpha + 0.1);
      makeNode(s);
      segs.push(s);
      extraBudget--;
    }
  }

  /* ---------- růst (kreslí se jen nové kousky do vrstvy) ---------- */

  function interp(s, f) {
    var i = Math.floor(f);
    if (i >= STEPS) return s.pts[STEPS];
    var t = f - i, a = s.pts[i], b = s.pts[i + 1];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function drawNode(n) {
    var c = types[n.type].rgb;
    dctx.fillStyle = rgba(c, 0.16);
    dctx.beginPath(); dctx.arc(n.x, n.y, n.r * 2.8, 0, Math.PI * 2); dctx.fill();
    dctx.fillStyle = rgba(c, 0.95);
    dctx.beginPath(); dctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); dctx.fill();
  }

  function grow(dG) {
    G += dG;
    for (var k = 0; k < segs.length; k++) {
      var s = segs[k];
      if (s.done || G <= s.start) continue;
      var p = Math.min(1, (G - s.start) / s.dur), f = p * STEPS;
      if (f <= s.drawn) continue;
      lctx.strokeStyle = rgba(types[s.type].rgb, s.alpha);
      lctx.lineWidth = s.width;
      lctx.beginPath();
      var a = interp(s, s.drawn);
      lctx.moveTo(a[0], a[1]);
      for (var i = Math.floor(s.drawn) + 1; i < f; i++) lctx.lineTo(s.pts[i][0], s.pts[i][1]);
      var b = interp(s, f);
      lctx.lineTo(b[0], b[1]);
      lctx.stroke();
      s.drawn = f;
      if (p >= 1) { s.done = true; drawNode(s.node); grown.push(s.node); }
    }
  }

  /* ---------- signály ---------- */

  function pointAt(s, d) {
    for (var j = 1; j <= STEPS; j++) {
      if (s.cum[j] >= d) {
        var t = (d - s.cum[j - 1]) / ((s.cum[j] - s.cum[j - 1]) || 1), a = s.pts[j - 1], b = s.pts[j];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    }
    return s.pts[STEPS];
  }

  function inwardPath(seg) { var p = []; while (seg) { p.push(seg); seg = seg.parent; } return p; }
  function pathLen(p) { return p.reduce(function (s, x) { return s + x.len; }, 0); }

  function spawnSignal(node, o) {
    var path = inwardPath(node.seg);
    if (o.out) path.reverse();
    var sig = {
      path: path, out: !!o.out, i: 0, d: 0, rgb: o.rgb || types[node.type].rgb,
      size: o.size || 1.1, trailLen: o.trail || 6, trail: [],
      speed: o.duration ? pathLen(path) / o.duration : CONFIG.signalRychlost * rand(0.6, 1.4),
      story: !!o.story, onEnd: o.onEnd, done: false,
    };
    signals.push(sig);
    return sig;
  }

  function advance(sig, dist) {
    while (dist > 0 && !sig.done) {
      var s = sig.path[sig.i], rem = s.len - sig.d;
      if (dist < rem) { sig.d += dist; dist = 0; }
      else {
        dist -= rem; sig.i++; sig.d = 0;
        if (sig.i >= sig.path.length) { sig.done = true; if (sig.onEnd) sig.onEnd(); }
      }
    }
    if (!sig.done) {
      var seg = sig.path[sig.i];
      sig.trail.push(pointAt(seg, sig.out ? sig.d : seg.len - sig.d));
      if (sig.trail.length > sig.trailLen) sig.trail.shift();
    }
  }

  function updateSignals(dt) {
    if (!reduced && grown.length > 40) {
      var want = Math.round(signalTarget * Math.min(1, grown.length / 400));
      var ambient = signals.filter(function (s) { return !s.story; }).length;
      for (var i = ambient; i < want; i++) spawnSignal(pick(grown), {});
    }
    signals.forEach(function (s) { advance(s, s.speed * dt * (s.story ? 1 : ts)); });
    signals = signals.filter(function (s) { return !s.done; });
  }

  /* ---------- příběh ---------- */

  function toScreen(x, y) {
    var c = Math.cos(rot), s = Math.sin(rot);
    return [W / 2 + (x * c - y * s) * sc, H / 2 + (x * s + y * c) * sc];
  }

  function nextLabel(list) {
    var arr = cfg.pribeh[list] || [];
    if (!arr.length) return "";
    return arr[storyIdx[list]++ % arr.length];
  }

  function pickVisibleNode(type, avoid) {
    var m = Math.min(W, H), best = [], fallback = [];
    grown.forEach(function (n) {
      var p = toScreen(n.x, n.y), dx = p[0] - W / 2, dy = p[1] - H / 2, d = Math.hypot(dx, dy);
      if (p[0] < 80 || p[0] > W - 80 || p[1] < 80 || p[1] > H - 80) return;
      if (d < m * 0.2 || d > m * 0.46) return;
      if (avoid) {
        var q = toScreen(avoid.x, avoid.y);
        var diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - Math.atan2(q[1] - H / 2, q[0] - W / 2)),
          Math.cos(Math.atan2(dy, dx) - Math.atan2(q[1] - H / 2, q[0] - W / 2))));
        if (diff < 1.4) return;
      }
      (n.type === type ? best : fallback).push(n);
    });
    return best.length ? pick(best) : (fallback.length ? pick(fallback) : null);
  }

  function newStory(wait) { story = { phase: "wait", t: 0, wait: wait }; }

  function arriveGreen() {
    story.phase = "calm"; story.t = 0;
    center.tc = types.zelena.rgb; center.ta = 0.6;
    tsTarget = 0.25; tsRate = 1.2; netAlphaTarget = 0.7;
  }

  function arriveRed() {
    story.phase = "redHold"; story.t = 0;
    center.c = types.cervena.rgb.slice(); center.a = 1;
    center.tc = [255, 255, 255]; center.ta = 0.12;
    hideLabel(ui.green); story.green = null;
    ts = reduced ? 1 : 2.4; tsTarget = 1; tsRate = 0.5; netAlphaTarget = 1;
    growBoost = 2.5;
    sprout(70);
    if (!reduced) {
      var leaves = grown.filter(function (n) { return n.seg.leaf; });
      for (var i = 0; i < 12 && leaves.length; i++) {
        spawnSignal(pick(leaves), { out: true, rgb: types.cervena.rgb, size: 1.8, trail: 10, duration: rand(1.2, 1.8), story: true });
      }
    }
  }

  function stepStory(dt) {
    var s = story;
    s.t += dt;
    switch (s.phase) {
      case "wait":
        if (s.t < s.wait) return;
        s.green = pickVisibleNode("zelena");
        if (!s.green) { s.t = 0; s.wait = 1; return; }
        showLabel(ui.green, nextLabel("zelene"), types.zelena.rgb);
        s.phase = "greenGlow"; s.t = 0;
        return;
      case "greenGlow":
        if (s.t < 1.6) return;
        s.phase = "greenTravel"; s.t = 0;
        if (reduced) arriveGreen();
        else spawnSignal(s.green, { rgb: types.zelena.rgb, size: 2.2, trail: 12, duration: 2.6, story: true, onEnd: arriveGreen });
        return;
      case "calm":
        if (s.t < 3) return;
        s.red = pickVisibleNode("cervena", s.green);
        if (!s.red) { s.t = 2.5; return; }
        showLabel(ui.red, nextLabel("cervene"), types.cervena.rgb);
        s.phase = "redTravel"; s.t = 0;
        if (reduced) arriveRed();
        else spawnSignal(s.red, { rgb: types.cervena.rgb, size: 3.2, trail: 16, duration: 0.9, story: true, onEnd: arriveRed });
        return;
      case "redHold":
        if (s.t < 2.8) return;
        hideLabel(ui.red);
        newStory(rand(CONFIG.pauza[0], CONFIG.pauza[1]));
        return;
    }
  }

  /* ---------- popisky ---------- */

  function makeLabel(cls) {
    var el = document.createElement("div");
    el.className = "chaos-label " + (cls || "");
    canvas.parentNode.appendChild(el);
    return el;
  }

  function showLabel(el, text, rgb) {
    if (!text) return;
    el.textContent = text;
    el.style.color = rgba(rgb, 1);
    el.style.borderColor = rgba(rgb, 0.7);
    el.classList.add("is-visible");
  }
  function hideLabel(el) { el.classList.remove("is-visible"); }

  function placeLabel(el, n) {
    var p = toScreen(n.x, n.y), right = p[0] < W - 220;
    el.style.transform = "translate(" + Math.round(p[0] + (right ? 14 : -14)) + "px," + Math.round(p[1]) + "px) translate(" + (right ? "0" : "-100%") + ",-50%)";
  }

  /* ---------- najetí / klepnutí ---------- */

  function findNode(px, py, maxDist) {
    var c = Math.cos(-rot), s = Math.sin(-rot);
    var dx = (px - W / 2) / sc, dy = (py - H / 2) / sc;
    var lx = dx * c - dy * s, ly = dx * s + dy * c;
    var best = null, bd = maxDist / sc;
    for (var i = 0; i < grown.length; i++) {
      var n = grown[i], d = Math.hypot(n.x - lx, n.y - ly);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  function onMove(e) {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
  }
  function onDown(e) {
    if (e.pointerType === "mouse") return;
    var n = findNode(e.clientX, e.clientY, 26);
    if (n) { hover = n; tapUntil = time + 2.5; showLabel(ui.hover, n.label, types[n.type].rgb); }
  }
  function onLeave() { pointer.has = false; }

  function updateHover() {
    if (time < tapUntil) return;
    if (pointer.has && frameNo % 2 === 0) hover = findNode(pointer.x, pointer.y, 14);
    else if (!pointer.has) hover = null;
    if (hover) showLabel(ui.hover, hover.label, types[hover.type].rgb);
    else hideLabel(ui.hover);
    canvas.style.cursor = hover ? "pointer" : "";
  }

  /* ---------- kreslení ---------- */

  function glow(x, y, r, rgb, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(rgb, a));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    var P = CONFIG.pulz;
    sc = 1 + 0.008 * Math.sin(pulseT * 0.9);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    ctx.scale(sc, sc);

    ctx.globalAlpha = netAlpha * (1 - P + P * Math.sin(pulseT * 1.3));
    ctx.drawImage(linesCv, -R, -R, 2 * R, 2 * R);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = netAlpha * (1 - P + P * Math.sin(pulseT * 1.9 + 1.2));
    ctx.drawImage(dotsCv, -R, -R, 2 * R, 2 * R);
    ctx.globalAlpha = 1;

    // signály
    signals.forEach(function (s) {
      var t = s.trail;
      if (!t.length) return;
      if (t.length > 1) {
        ctx.strokeStyle = rgba(s.rgb, s.story ? 0.7 : 0.45);
        ctx.lineWidth = s.size * 0.9;
        ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]);
        for (var i = 1; i < t.length; i++) ctx.lineTo(t[i][0], t[i][1]);
        ctx.stroke();
      }
      var h = t[t.length - 1];
      if (s.story) glow(h[0], h[1], s.size * 7, s.rgb, 0.6);
      ctx.fillStyle = rgba(s.rgb, 1);
      ctx.beginPath(); ctx.arc(h[0], h[1], s.size, 0, Math.PI * 2); ctx.fill();
    });

    // střed
    var m = Math.min(W, H);
    glow(0, 0, Math.max(50, m * 0.16), center.c, center.a);
    glow(0, 0, 6, center.c, Math.min(1, center.a + 0.3));

    // zvýrazněné uzly příběhu
    if (story && story.green) {
      var gp = 0.5 + 0.5 * Math.sin(time * 4);
      glow(story.green.x, story.green.y, 18 + gp * 6, types.zelena.rgb, 0.55);
      ctx.fillStyle = rgba(types.zelena.rgb, 1);
      ctx.beginPath(); ctx.arc(story.green.x, story.green.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (story && story.red && (story.phase === "redTravel" || story.phase === "redHold")) {
      glow(story.red.x, story.red.y, 24, types.cervena.rgb, story.phase === "redTravel" ? 0.8 : 0.4);
    }
    if (hover) {
      ctx.strokeStyle = rgba(types[hover.type].rgb, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hover.x, hover.y, hover.r + 5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    if (story && story.green) placeLabel(ui.green, story.green);
    if (story && story.red) placeLabel(ui.red, story.red);
    if (hover) placeLabel(ui.hover, hover);
  }

  /* ---------- smyčka ---------- */

  function ease(v, target, rate, dt) { return v + (target - v) * (1 - Math.exp(-rate * dt)); }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now; time += dt; frameNo++;

    // když to nestíhá 45 fps, ubereme signály
    if (time > 1 && perf.checked < 2) {
      perf.n++; perf.sum += dt;
      if (perf.n >= 120) {
        if (perf.sum / perf.n > 1 / 45) signalTarget = Math.round(signalTarget * 0.5);
        perf.n = 0; perf.sum = 0; perf.checked++;
      }
    }

    ts = ease(ts, tsTarget, tsRate, dt);
    netAlpha = ease(netAlpha, netAlphaTarget, 1.5, dt);
    growBoost *= Math.exp(-0.7 * dt);
    for (var i = 0; i < 3; i++) center.c[i] = ease(center.c[i], center.tc[i], 2, dt);
    center.a = ease(center.a, center.ta, 1.2, dt);

    if (reduced) {
      pulseT += dt * 0.35;
    } else {
      rot += CONFIG.rotace * ts * dt;
      pulseT += dt * ts;
      grow(dt * (1 + growBoost) * ts);
    }
    stepStory(dt);
    updateSignals(dt);
    updateHover();
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- API ---------- */

  function build() {
    setupCanvas();
    generate();
    signals = [];
    if (reduced) grow(1e9);
    else { var g = G; G = 0; grow(g); }
  }

  function onResize() {
    build();
    if (story) { hideLabel(ui.green); hideLabel(ui.red); }
    newStory(1.5);
  }

  function start(cnv, config) {
    stop();
    canvas = cnv;
    ctx = canvas.getContext("2d");
    cfg = config;
    reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ui) ui = { green: makeLabel("chaos-label--story"), red: makeLabel("chaos-label--story"), hover: makeLabel() };
    setupTypes();
    G = 0; rot = 0; ts = 1; tsTarget = 1; netAlpha = netAlphaTarget = 1; time = 0; pulseT = 0;
    growBoost = reduced ? 0 : 4;
    center.c = [255, 255, 255]; center.a = 0.12; center.tc = [255, 255, 255]; center.ta = 0.12;
    signalTarget = W * H > 700000 || canvas.clientWidth * canvas.clientHeight > 700000 ? CONFIG.signaly : Math.round(CONFIG.signaly / 2);
    perf = { n: 0, sum: 0, checked: 0 };
    hover = null; tapUntil = 0;
    build();
    newStory(2.5);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    document.documentElement.addEventListener("pointerleave", onLeave);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    if (ui) { hideLabel(ui.green); hideLabel(ui.red); hideLabel(ui.hover); }
    pointer.has = false;
  }

  window.Chaos = { start: start, stop: stop };
})();
