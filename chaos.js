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

    // --- neklid sítě (všechno se násobí chaosLevel 0–1) ---
    vlneni: 12,          // vlnění: posun konců větví v px při chaosLevel 1 (na okraji sítě)
    ohyb: 0.18,          // vlnění: prohnutí větve (podíl její délky) při chaosLevel 1
    vlneniRychlost: 0.35,// jak rychle se větve vlní
    chveni: 1.5,         // chvění (jitter) v px při chaosLevel 1
    chveniRychlost: 9,   // jak rychle se chvějí (vyšší = nervóznější)
    stred: 0.15,         // kolik pohybu mají větve u středu oproti okraji (0–1)
    chaosBezny: 0.5,     // běžný chaosLevel
    chaosZeleny: 0.1,    // chaosLevel ve zelené chvilce
    chaosRudy: 1.0,      // chaosLevel po rudém signálu (pak pomalu klesá)
  };

  var canvas, ctx, cfg, raf = null, last = 0, time = 0, pulseT = 0;
  var W = 0, H = 0, dpr = 1, R = 0, sc = 1;
  var types = {}, typeKeys = [], PAL = null, grainCv = null;
  var segs = [], grown = [], buckets = [], bucketMap = {}, G = 0, extraBudget = 0;
  var rot = 0, ts = 1, tsTarget = 1, tsRate = 1.5, netAlpha = 1, netAlphaTarget = 1, growBoost = 0;
  var chaosLevel = 0.5, chaosTarget = 0.5, chaosRate = 1;
  var waveT = 0, jitT = 0;
  var signals = [], signalTarget = 0;
  var center = { c: [255, 255, 255], a: 0.12, tc: [255, 255, 255], ta: 0.12 };
  var story = null, storyIdx = { zelene: 0, cervene: 0 };
  var reduced = false;
  var ui = null;
  var pointer = { x: 0, y: 0, has: false }, hover = null, tapUntil = 0, frameNo = 0;
  var perf = { n: 0, sum: 0, checked: 0 }, noiseEvery = 1;

  /* ---------- pomocné ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")"; }
  function hexRgb(h) { var n = parseInt(h.replace("#", ""), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function lerpAngle(a, b, t) { return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t; }

  // 1D Perlinův šum – plynulé hodnoty zhruba v rozsahu −1…1
  var PERM = new Uint8Array(512), GRAD = new Float32Array(256);
  (function () {
    var p = [];
    for (var i = 0; i < 256; i++) { p.push(i); GRAD[i] = Math.random() * 2 - 1; }
    for (i = 255; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();
  function noise(x) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    var a = GRAD[PERM[i & 255]] * f, b = GRAD[PERM[(i + 1) & 255]] * (f - 1);
    return (a + (b - a) * u) * 2;
  }

  function setupTypes() {
    var pal = cfg.paleta || {}, pt = pal.typy || {};
    PAL = {
      bg: pal.pozadi || "#0A090B",
      grain: pal.zrno != null ? pal.zrno : 0.06,
      fill: (pal.vypln || ["#2E3FD1", "#6E9A3A"]).map(hexRgb),
      calm: hexRgb(pal.stred || pt.zelena || "#22C7B0"),
      red: hexRgb(pal.rudy || pt.cervena || "#F2271C"),
    };
    types = {};
    typeKeys = Object.keys(cfg.typy);
    typeKeys.forEach(function (k) {
      var t = cfg.typy[k];
      types[k] = { rgb: hexRgb(pt[k] || t.barva || "#888888"), size: t.velikost, weight: t.cetnost, labels: t.popisky && t.popisky.length ? t.popisky : [k] };
    });
  }

  // statická vrstva filmového zrna a škrábanců – vykreslí se jednou, přes canvas ji skládá prohlížeč
  function makeGrain() {
    if (!grainCv) {
      grainCv = document.createElement("canvas");
      grainCv.className = "chaos-grain";
      grainCv.setAttribute("aria-hidden", "true");
      canvas.parentNode.insertBefore(grainCv, canvas.nextSibling);
    }
    grainCv.style.opacity = PAL.grain;
    grainCv.style.display = PAL.grain > 0 ? "" : "none";
    var w = Math.min(2048, Math.ceil(W)), h = Math.min(2048, Math.ceil(H));
    if (grainCv.width === w && grainCv.height === h) return;
    grainCv.width = w; grainCv.height = h;
    var g = grainCv.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = "round";
    for (var k = 0; k < 10; k++) {
      var x = rand(0, w), y = rand(0, h), len = rand(0.08, 0.45) * h;
      var ang = Math.PI / 2 + rand(-0.25, 0.25) + (Math.random() < 0.2 ? Math.PI / 2 : 0);
      var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      g.strokeStyle = Math.random() < 0.75 ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.95)";
      g.lineWidth = rand(0.6, 1.6);
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo((x + ex) / 2 + rand(-12, 12), (y + ey) / 2, ex, ey);
      g.stroke();
    }
    for (k = 0; k < 40; k++) {
      g.fillStyle = Math.random() < 0.6 ? "#fff" : "#000";
      g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(0.6, 1.8), 0, Math.PI * 2); g.fill();
    }
  }

  function pickType(allowGreen) {
    var keys = typeKeys.filter(function (k) { return allowGreen || k !== "zelena"; });
    var total = keys.reduce(function (s, k) { return s + types[k].weight; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < keys.length; i++) { r -= types[keys[i]].weight; if (r <= 0) return keys[i]; }
    return keys[0];
  }

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    R = Math.hypot(W, H) / 2 * 1.04;
  }

  /* ---------- generování sítě ---------- */

  // čáry se kreslí po skupinách (stejná barva + tloušťka) – jeden tah na skupinu
  function addToBucket(s, key) {
    var b = bucketMap[key];
    if (!b) {
      b = bucketMap[key] = { rgb: s.filler != null ? PAL.fill[s.filler] : types[s.type].rgb, alpha: s.alpha, width: s.width, list: [] };
      buckets.push(b);
    }
    b.list.push(s);
  }

  function makeSeg(parent, x0, y0, a, len, depth, type, start) {
    var x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    var bend = rand(-CONFIG.zakriveni, CONFIG.zakriveni) * len;
    var cx = (x0 + x1) / 2 - Math.sin(a) * bend, cy = (y0 + y1) / 2 + Math.cos(a) * bend;
    // délka quadratické křivky (dost přesně pro tempo signálů)
    var L = 0, px = x0, py = y0;
    for (var i = 1; i <= 6; i++) {
      var t = i / 6, u = 1 - t;
      var qx = u * u * x0 + 2 * u * t * cx + t * t * x1, qy = u * u * y0 + 2 * u * t * cy + t * t * y1;
      L += Math.hypot(qx - px, qy - py); px = qx; py = qy;
    }
    var dist = Math.hypot(x1, y1);
    var radial = Math.min(1, dist / R);
    return {
      x0: x0, y0: y0, cx: cx, cy: cy, x1: x1, y1: y1,
      len: L, a: Math.atan2(y1 - cy, x1 - cx), nx: -Math.sin(a), ny: Math.cos(a),
      depth: depth, parent: parent, type: type,
      width: Math.max(0.5, 1.5 - Math.min(depth, 12) * 0.08),
      alpha: Math.max(0.28, 0.62 - Math.min(depth, 12) * 0.028),
      start: start != null ? start : (parent ? parent.start + parent.dur : rand(0, 0.4)),
      dur: L / CONFIG.rustRychlost,
      // pohyb: každá větev má vlastní fázi a rychlost
      seed: Math.random() * 200, spd: rand(0.6, 1.5),
      amp: CONFIG.stred + (1 - CONFIG.stred) * radial,
      // aktuální (rozvlněná) poloha
      sx: x0, sy: y0, qx: cx, qy: cy, ex: x1, ey: y1,
      started: false, done: false, leaf: true, node: null,
    };
  }

  function makeNode(s) {
    var t = s.type;
    if (s.leaf && Math.random() * 100 < types.zelena.weight) t = "zelena";
    s.node = { type: t, r: types[t].size * (s.leaf ? 1 : 0.55), seg: s, label: pick(types[t].labels) };
  }

  function generate() {
    segs = []; grown = []; buckets = []; bucketMap = {};
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
    segs.forEach(function (s) { makeNode(s); addToBucket(s, s.type + "|" + Math.min(s.depth, 12)); });
    addFillers(Math.round(segs.length * 0.3));
  }

  // výplňové větve bez uzlu – střídají dvě barvy z palety, slabší, dodávají hloubku
  function addFillers(count) {
    var base = segs.slice();
    for (var i = 0; i < count; i++) {
      var p = pick(base);
      if (p.depth < 1) continue;
      var side = Math.random() < 0.5 ? -1 : 1;
      var s = makeSeg(p, p.x1, p.y1, p.a + side * rand(0.4, 1.1), p.len * rand(0.6, 1.1), p.depth + 1, "vypln");
      s.filler = i % PAL.fill.length;
      s.alpha *= 0.5;
      s.width = Math.max(0.5, s.width * 0.8);
      segs.push(s);
      addToBucket(s, "vypln" + s.filler + "|" + Math.min(s.depth, 12));
    }
  }

  // při „nárazu“ síť zhoustne – z existujících uzlů vyraší nové výhonky
  function sprout(count) {
    if (reduced) return;
    for (var i = 0; i < count && extraBudget > 0 && grown.length; i++) {
      var p = pick(grown).seg;
      if (p.depth < 2) continue;
      var type = Math.random() < 0.5 ? "cervena" : p.type;
      var s = makeSeg(p, p.x1, p.y1, p.a + rand(-1, 1), p.len * rand(0.4, 0.8), p.depth + 1, type, G + rand(0, 0.8));
      s.alpha = Math.min(0.7, s.alpha + 0.1);
      makeNode(s);
      segs.push(s);
      addToBucket(s, s.type + "|s" + Math.min(s.depth, 12));
      extraBudget--;
    }
  }

  /* ---------- růst + vlnění ---------- */

  function grow() {
    for (var k = 0; k < segs.length; k++) {
      var s = segs[k];
      if (!s.started && G > s.start) s.started = true;
      if (s.started && !s.done && G >= s.start + s.dur) { s.done = true; if (s.node) grown.push(s.node); }
    }
  }

  // posune konce a řídicí body všech větví podle šumu (rodiče jsou v poli vždy dřív než děti)
  function deform() {
    var wAmp = CONFIG.vlneni * chaosLevel * (reduced ? 0.3 : 1);
    var bAmp = CONFIG.ohyb * chaosLevel * (reduced ? 0.3 : 1);
    var jAmp = reduced ? 0 : CONFIG.chveni * chaosLevel;
    for (var k = 0; k < segs.length; k++) {
      var s = segs[k];
      if (!s.started) continue;
      if (s.parent) { s.sx = s.parent.ex; s.sy = s.parent.ey; }
      var tw = waveT * s.spd + s.seed, tj = jitT * s.spd + s.seed * 3;
      var dx = noise(tw) * wAmp, dy = noise(tw + 71.3) * wAmp;
      if (jAmp) { dx += noise(tj) * jAmp; dy += noise(tj + 37.7) * jAmp; }
      s.ex = s.x1 + dx * s.amp;
      s.ey = s.y1 + dy * s.amp;
      var b = noise(tw * 1.3 + 113.1) * bAmp * s.len * s.amp;
      if (jAmp) b += noise(tj * 1.2 + 91.9) * jAmp * 0.8;
      s.qx = s.cx + (s.sx - s.x0 + s.ex - s.x1) / 2 + s.nx * b;
      s.qy = s.cy + (s.sy - s.y0 + s.ey - s.y1) / 2 + s.ny * b;
    }
  }

  function bez(s, t) {
    var u = 1 - t;
    return [u * u * s.sx + 2 * u * t * s.qx + t * t * s.ex, u * u * s.sy + 2 * u * t * s.qy + t * t * s.ey];
  }

  /* ---------- signály ---------- */

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
      var seg = sig.path[sig.i], t = sig.d / (seg.len || 1);
      sig.trail.push(bez(seg, sig.out ? t : 1 - t));
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
  function nodeScreen(n) { return toScreen(n.seg.ex, n.seg.ey); }

  function nextLabel(list) {
    var arr = cfg.pribeh[list] || [];
    if (!arr.length) return "";
    return arr[storyIdx[list]++ % arr.length];
  }

  function pickVisibleNode(type, avoid) {
    var m = Math.min(W, H), best = [], fallback = [];
    var q = avoid ? nodeScreen(avoid) : null;
    grown.forEach(function (n) {
      var p = nodeScreen(n), dx = p[0] - W / 2, dy = p[1] - H / 2, d = Math.hypot(dx, dy);
      if (p[0] < 80 || p[0] > W - 80 || p[1] < 80 || p[1] > H - 80) return;
      if (d < m * 0.2 || d > m * 0.46) return;
      if (q) {
        var diff = Math.atan2(dy, dx) - Math.atan2(q[1] - H / 2, q[0] - W / 2);
        if (Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) < 1.4) return;
      }
      (n.type === type ? best : fallback).push(n);
    });
    return best.length ? pick(best) : (fallback.length ? pick(fallback) : null);
  }

  function newStory(wait) { story = { phase: "wait", t: 0, wait: wait }; }

  function arriveGreen() {
    story.phase = "calm"; story.t = 0;
    center.tc = PAL.calm; center.ta = 0.6;
    tsTarget = 0.25; tsRate = 1.2; netAlphaTarget = 0.7;
    chaosTarget = CONFIG.chaosZeleny; chaosRate = 1.2;
  }

  function arriveRed() {
    story.phase = "redHold"; story.t = 0;
    center.c = PAL.red.slice(); center.a = 1;
    center.tc = [255, 255, 255]; center.ta = 0.12;
    hideLabel(ui.green); story.green = null;
    ts = reduced ? 1 : 2.4; tsTarget = 1; tsRate = 0.5; netAlphaTarget = 1;
    chaosLevel = CONFIG.chaosRudy; chaosTarget = CONFIG.chaosBezny; chaosRate = 0.25;
    growBoost = 2.5;
    sprout(70);
    if (!reduced) {
      var leaves = grown.filter(function (n) { return n.seg.leaf; });
      for (var i = 0; i < 12 && leaves.length; i++) {
        spawnSignal(pick(leaves), { out: true, rgb: PAL.red, size: 1.8, trail: 10, duration: rand(1.2, 1.8), story: true });
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
        showLabel(ui.red, nextLabel("cervene"), PAL.red);
        s.phase = "redTravel"; s.t = 0;
        if (reduced) arriveRed();
        else spawnSignal(s.red, { rgb: PAL.red, size: 3.2, trail: 16, duration: 0.9, story: true, onEnd: arriveRed });
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
    var p = nodeScreen(n), right = p[0] < W - 220;
    el.style.transform = "translate(" + Math.round(p[0] + (right ? 14 : -14)) + "px," + Math.round(p[1]) + "px) translate(" + (right ? "0" : "-100%") + ",-50%)";
  }

  /* ---------- najetí / klepnutí ---------- */

  function findNode(px, py, maxDist) {
    var c = Math.cos(-rot), s = Math.sin(-rot);
    var dx = (px - W / 2) / sc, dy = (py - H / 2) / sc;
    var lx = dx * c - dy * s, ly = dx * s + dy * c;
    var best = null, bd = maxDist / sc;
    for (var i = 0; i < grown.length; i++) {
      var n = grown[i], d = Math.hypot(n.seg.ex - lx, n.seg.ey - ly);
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

  function drawLines(alpha) {
    for (var b = 0; b < buckets.length; b++) {
      var bk = buckets[b], any = false;
      ctx.beginPath();
      for (var i = 0; i < bk.list.length; i++) {
        var s = bk.list[i];
        if (!s.started) continue;
        any = true;
        ctx.moveTo(s.sx, s.sy);
        if (s.done) ctx.quadraticCurveTo(s.qx, s.qy, s.ex, s.ey);
        else {
          // rostoucí větev: první část křivky (de Casteljau)
          var p = Math.min(1, (G - s.start) / s.dur), e = bez(s, p);
          ctx.quadraticCurveTo(s.sx + (s.qx - s.sx) * p, s.sy + (s.qy - s.sy) * p, e[0], e[1]);
        }
      }
      if (!any) continue;
      ctx.strokeStyle = rgba(bk.rgb, bk.alpha * alpha);
      ctx.lineWidth = bk.width;
      ctx.stroke();
    }
  }

  function drawDots(alpha) {
    var byType = {};
    for (var i = 0; i < grown.length; i++) {
      var n = grown[i];
      (byType[n.type] || (byType[n.type] = [])).push(n);
    }
    Object.keys(byType).forEach(function (k) {
      var list = byType[k], c = types[k].rgb, j, n;
      ctx.fillStyle = rgba(c, 0.16 * alpha);
      ctx.beginPath();
      for (j = 0; j < list.length; j++) { n = list[j]; ctx.moveTo(n.seg.ex + n.r * 2.8, n.seg.ey); ctx.arc(n.seg.ex, n.seg.ey, n.r * 2.8, 0, Math.PI * 2); }
      ctx.fill();
      ctx.fillStyle = rgba(c, 0.95 * alpha);
      ctx.beginPath();
      for (j = 0; j < list.length; j++) { n = list[j]; ctx.moveTo(n.seg.ex + n.r, n.seg.ey); ctx.arc(n.seg.ex, n.seg.ey, n.r, 0, Math.PI * 2); }
      ctx.fill();
    });
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, W, H);

    var P = CONFIG.pulz;
    sc = 1 + 0.008 * Math.sin(pulseT * 0.9);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.lineCap = "round";

    drawLines(netAlpha * (1 - P + P * Math.sin(pulseT * 1.3)));
    ctx.globalCompositeOperation = "lighter";
    drawDots(netAlpha * (1 - P + P * Math.sin(pulseT * 1.9 + 1.2)));

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
      var gs = story.green.seg, gp = 0.5 + 0.5 * Math.sin(time * 4);
      glow(gs.ex, gs.ey, 18 + gp * 6, types.zelena.rgb, 0.55);
      ctx.fillStyle = rgba(types.zelena.rgb, 1);
      ctx.beginPath(); ctx.arc(gs.ex, gs.ey, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (story && story.red && (story.phase === "redTravel" || story.phase === "redHold")) {
      glow(story.red.seg.ex, story.red.seg.ey, 24, PAL.red, story.phase === "redTravel" ? 0.8 : 0.4);
    }
    if (hover) {
      ctx.strokeStyle = rgba(types[hover.type].rgb, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hover.seg.ex, hover.seg.ey, hover.r + 5, 0, Math.PI * 2); ctx.stroke();
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

    // když to nestíhá ~45 fps: nejdřív méně signálů, pak šum jen každý druhý snímek
    if (time > 1 && perf.checked < 3) {
      perf.n++; perf.sum += dt;
      if (perf.n >= 120) {
        if (perf.sum / perf.n > 1 / 45) {
          if (perf.checked === 0) signalTarget = Math.round(signalTarget * 0.5);
          else noiseEvery = 2;
        }
        perf.n = 0; perf.sum = 0; perf.checked++;
      }
    }

    ts = ease(ts, tsTarget, tsRate, dt);
    netAlpha = ease(netAlpha, netAlphaTarget, 1.5, dt);
    chaosLevel = ease(chaosLevel, chaosTarget, chaosRate, dt);
    growBoost *= Math.exp(-0.7 * dt);
    for (var i = 0; i < 3; i++) center.c[i] = ease(center.c[i], center.tc[i], 2, dt);
    center.a = ease(center.a, center.ta, 1.2, dt);

    if (reduced) {
      pulseT += dt * 0.35;
      waveT += dt * CONFIG.vlneniRychlost * 0.4;
    } else {
      rot += CONFIG.rotace * ts * dt;
      pulseT += dt * ts;
      waveT += dt * CONFIG.vlneniRychlost * (0.5 + chaosLevel);
      jitT += dt * CONFIG.chveniRychlost * (0.4 + chaosLevel);
      G += dt * (1 + growBoost) * ts;
    }
    grow();
    if (frameNo % noiseEvery === 0) deform();
    stepStory(dt);
    updateSignals(dt);
    updateHover();
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- API ---------- */

  function build() {
    setupCanvas();
    makeGrain();
    generate();
    signals = [];
    if (reduced) G = 1e9;
    grow();
    deform();
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
    waveT = 0; jitT = 0; noiseEvery = 1;
    chaosLevel = chaosTarget = CONFIG.chaosBezny; chaosRate = 1;
    growBoost = reduced ? 0 : 4;
    center.c = [255, 255, 255]; center.a = 0.12; center.tc = [255, 255, 255]; center.ta = 0.12;
    signalTarget = canvas.clientWidth * canvas.clientHeight > 700000 ? CONFIG.signaly : Math.round(CONFIG.signaly / 2);
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
