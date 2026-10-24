/*
  Scéna chaos – generativní „neuronová síť“ na canvasu.
  Barvy (váhy, záře), velikosti teček a popisky: content.js (OBSAH.chaos).
  Technické ladění: CONFIG hned níže.
*/
(function () {
  "use strict";

  var CONFIG = {
    uzlyDesktop: 2200,   // max. počet větví/uzlů na velké obrazovce
    uzlyMobil: 1100,     // max. počet větví/uzlů na mobilu
    vetveni: 0.55,       // šance, že se větev rozdvojí (0–1) – víc = hustší síť
    uhel: 0.55,          // max. odklon nové větve (radiány)
    zakriveni: 0.25,     // jak moc jsou větve prohnuté (0 = rovné)
    rustRychlost: 70,    // rychlost dorůstání (px/s)
    rotace: 0.012,       // rychlost otáčení celé sítě (rad/s)
    signaly: 50,         // kolik světelných signálů běží najednou (mobil polovina)
    signalRychlost: 140, // rychlost signálů (px/s)
    pulz: 0.12,          // síla pulzování (0–1)
    pauza: [1.5, 3.5],   // pauza mezi příběhy (s); celý příběh trvá ~10 s

    // --- kompozice ---
    centra: [4, 5],      // počet růstových center [mobil, desktop] (včetně hlavního středu)
    hustotaStredu: 0.45, // podíl všech větví, který patří hlavnímu středu (víc = hustší střed)
    korenuStred: 30,     // kolik větví vyrůstá z hlavního středu
    esovka: 0.16,        // jak moc je diagonální „S“ prohnuté (0 = rovná diagonála)

    // --- chomáče (chmýří) ---
    chomacInterval: [1, 3], // jak často se objeví nový chomáč (s)
    chomacMax: [4, 6],      // max. chomáčů najednou [mobil, desktop]
    chomacLinek: [20, 60],  // počet linek v chomáči
    chomacRozptyl: 0.22,    // jak daleko od středu se objevují (menší = blíž středu)

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
  var W = 0, H = 0, dpr = 1, R = 0, sc = 1, mobile = false;
  var types = {}, groups = [], groupMap = {}, PAL = null, grainCv = null, sprites = {};
  var glowCv = null, gctx = null, GLOW_RES = 4; // záře se kreslí ve čtvrtinovém rozlišení (je rozmazaná)
  var segs = [], grown = [], buckets = [], bucketMap = {}, G = 0, extraBudget = 0;
  var dots = [], dotMap = {}; // viditelné tečky (konce větví, červené, bílé) rozdělené podle barvy
  var rot = 0, ts = 1, tsTarget = 1, tsRate = 1.5, netAlpha = 1, netAlphaTarget = 1, growBoost = 0;
  var chaosLevel = 0.5, chaosTarget = 0.5, chaosRate = 1;
  var waveT = 0, jitT = 0;
  var signals = [], signalTarget = 0;
  var tufts = [], nextTuft = 1;
  var center = { c: [255, 255, 255], a: 0.12, tc: [255, 255, 255], ta: 0.12 };
  var story = null, storyIdx = { zelene: 0, cervene: 0 };
  var reduced = false;
  var ui = null;
  var pointer = { x: 0, y: 0, has: false }, hover = null, tapUntil = 0, frameNo = 0;
  var perf = { n: 0, sum: 0, checked: 0 }, noiseEvery = 1, glowEvery = 1;

  /* ---------- pomocné ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
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

  /* ---------- paleta, typy, záře ---------- */

  function setupPalette() {
    var pal = cfg.paleta || {}, sk = pal.skupiny || {};
    PAL = {
      bg: pal.pozadi || "#0A090B",
      grain: pal.zrno != null ? pal.zrno : 0.06,
      glow: pal.zareSila != null ? pal.zareSila : 1,
      calm: hexRgb(pal.stred || "#22C7B0"),
      red: hexRgb(pal.rudy || "#F2271C"),
      tuftBias: pal.chomace || [],
    };
    types = {};
    Object.keys(cfg.typy).forEach(function (k) {
      var t = cfg.typy[k];
      types[k] = { size: t.velikost || 1.6, labels: t.popisky && t.popisky.length ? t.popisky : [k] };
    });
    groups = []; groupMap = {};
    Object.keys(sk).forEach(function (k) {
      var g = sk[k];
      var grp = {
        key: k, weight: g.vaha || 0, shades: (g.barvy || ["#ffffff"]).map(hexRgb),
        type: g.typ && types[g.typ] ? g.typ : null,
        glow: g.zare || 1, milky: !!g.mlecna, nodes: g.uzly !== false,
      };
      groups.push(grp); groupMap[k] = grp;
    });
    sprites = {};
  }

  function pickGroup(bias) {
    var total = 0, i, w = groups.map(function (g) {
      var x = g.weight * (bias && bias.indexOf(g.key) >= 0 ? 3 : 1);
      total += x; return x;
    });
    var r = Math.random() * total;
    for (i = 0; i < groups.length; i++) { r -= w[i]; if (r <= 0) return groups[i]; }
    return groups[0];
  }
  function groupOfType(type) {
    for (var i = 0; i < groups.length; i++) if (groups[i].type === type) return groups[i];
    return groups[0];
  }

  // předrenderovaná záře (radiální gradient) pro každou barvu – žádný shadowBlur
  var SPRITE = 96, CORE = 0.11;
  function sprite(rgb, milky) {
    var key = rgb.join(",") + (milky ? "m" : "");
    if (sprites[key]) return sprites[key];
    var c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    var g = c.getContext("2d"), h = SPRITE / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
    if (milky) {
      gr.addColorStop(0, rgba(rgb, 0.95));
      gr.addColorStop(CORE, rgba(rgb, 0.75));
      gr.addColorStop(0.3, rgba(rgb, 0.16));
      gr.addColorStop(0.65, rgba(rgb, 0.05));
    } else {
      gr.addColorStop(0, rgba([255, 255, 255], 1));
      gr.addColorStop(CORE * 0.5, rgba(rgb, 1));
      gr.addColorStop(CORE, rgba(rgb, 0.9));
      gr.addColorStop(0.22, rgba(rgb, 0.3));
      gr.addColorStop(0.5, rgba(rgb, 0.08));
    }
    gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, SPRITE, SPRITE);
    sprites[key] = c;
    return c;
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

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    R = Math.hypot(W, H) / 2 * 1.04;
    mobile = W * H <= 700000;
    glowCv = glowCv || document.createElement("canvas");
    glowCv.width = Math.ceil(W / GLOW_RES);
    glowCv.height = Math.ceil(H / GLOW_RES);
    gctx = glowCv.getContext("2d");
  }

  /* ---------- generování sítě ---------- */

  // čáry se kreslí po skupinách (stejná barva + tloušťka + průhlednost) – jeden tah na skupinu
  function addToBucket(s) {
    var wq = Math.max(1, Math.round(s.width * 4)), aq = Math.max(1, Math.round(s.alpha * 12));
    var key = s.rgb.join(",") + "|" + wq + "|" + aq;
    var b = bucketMap[key];
    if (!b) {
      b = bucketMap[key] = { rgb: s.rgb, alpha: aq / 12, width: wq / 4, list: [] };
      buckets.push(b);
    }
    b.list.push(s);
  }

  function makeSeg(parent, x0, y0, a, len, depth, group, start, hub) {
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
    var radial = Math.min(1, Math.hypot(x1, y1) / R);
    var z = hub.z, d = Math.min(depth, 12);
    return {
      x0: x0, y0: y0, cx: cx, cy: cy, x1: x1, y1: y1,
      len: L, a: Math.atan2(y1 - cy, x1 - cx), nx: -Math.sin(a), ny: Math.cos(a),
      depth: depth, parent: parent, group: group, hub: hub,
      rgb: pick(group.shades),
      // vzdálenější centra tenčí a průhlednější, bližší sytější
      width: Math.max(0.3, (1.5 - d * 0.08) * (0.45 + 0.55 * z)),
      alpha: Math.max(0.1, (0.5 - d * 0.022) * (0.35 + 0.65 * z)),
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
    var g = s.group;
    if (!g.nodes) return;
    var size = g.type ? types[g.type].size : 1.3;
    s.node = {
      type: g.type, rgb: s.rgb, glow: g.glow, milky: g.milky, seg: s,
      r: size * (s.leaf ? 1 : 0.55) * (0.6 + 0.4 * s.hub.z),
      label: g.type ? pick(types[g.type].labels) : null,
    };
  }

  // růstová centra: hlavní hustý střed + další podél diagonální „esovky“
  function makeHubs() {
    var count = CONFIG.centra[mobile ? 0 : 1], m = Math.min(W, H);
    var ang = -Math.atan2(H, W), span = Math.hypot(W, H) * 0.45;
    var hubs = [
      { x: 0, y: 0, share: CONFIG.hustotaStredu * 0.7, reach: R * 0.72, roots: CONFIG.korenuStred, z: 1, main: true },
      // husté jádro přímo ve středu – krátké větve, aby střed nebyl prázdný
      { x: 0, y: 0, share: CONFIG.hustotaStredu * (mobile ? 0.18 : 0.3), reach: R * 0.2, roots: Math.round(CONFIG.korenuStred * 1.3), z: 1, main: true, core: true },
    ];
    var slots = [-0.85, -0.4, 0.42, 0.88].sort(function () { return Math.random() - 0.5; }).slice(0, count - 1);
    var rest = 0;
    slots.forEach(function (t) {
      var along = t * span, perp = Math.sin(t * Math.PI) * CONFIG.esovka * m * 2;
      var share = rand(0.5, 1.6);
      rest += share;
      hubs.push({
        x: Math.cos(ang) * along - Math.sin(ang) * perp,
        y: Math.sin(ang) * along + Math.cos(ang) * perp,
        share: share, reach: R * rand(0.3, 0.55), roots: randInt(8, 18), z: rand(0.45, 0.9),
      });
    });
    hubs.forEach(function (h) { if (!h.main) h.share = h.share / rest * (1 - CONFIG.hustotaStredu); });
    return hubs;
  }

  function growHub(h, budget) {
    var queue = [], count = 0, L0 = h.reach / (h.core ? 4 : h.main ? 6.5 : 4.5);
    for (var i = 0; i < h.roots; i++) {
      var a = i / h.roots * Math.PI * 2 + rand(-0.2, 0.2);
      queue.push(makeSeg(null, h.x + Math.cos(a) * 3, h.y + Math.sin(a) * 3, a, L0 * rand(0.5, 1.1), 0, pickGroup(), null, h));
    }
    while (queue.length && count < budget) {
      var s = queue.shift();
      segs.push(s); count++;
      var dh = Math.hypot(s.x1 - h.x, s.y1 - h.y);
      // každá větev končí v jiné vzdálenosti – konce netvoří prstenec
      if (dh > h.reach * rand(0.45, 1) || Math.hypot(s.x1, s.y1) > R || s.depth > 16) continue;
      var kids = s.depth < 2 ? 2 : (Math.random() < CONFIG.vetveni ? 2 : 1);
      if (s.depth > 3 && Math.random() < 0.07) kids = 0;
      for (var k = 0; k < kids; k++) {
        var ang = s.a + (kids === 2 ? (k ? 1 : -1) * rand(0.15, CONFIG.uhel) : rand(-CONFIG.uhel, CONFIG.uhel) * 0.6);
        ang = lerpAngle(ang, Math.atan2(s.y1 - h.y, s.x1 - h.x), 0.12);
        var grp = Math.random() < 0.7 ? s.group : pickGroup();
        queue.push(makeSeg(s, s.x1, s.y1, ang, Math.max(R * 0.015, s.len * rand(0.8, 0.95)), s.depth + 1, grp, null, h));
      }
    }
  }

  // tenká spojnice z hlavního středu k vedlejšímu centru (výplň, bez uzlů)
  function connect(h, main) {
    var steps = 4, prev = null, x = main.x, y = main.y;
    var grp = pickGroup(["bila", "modra", "olivova"]);
    if (grp.type) grp = groupMap.bila || grp;
    for (var i = 1; i <= steps; i++) {
      var tx = main.x + (h.x - main.x) * i / steps + rand(-1, 1) * 30, ty = main.y + (h.y - main.y) * i / steps + rand(-1, 1) * 30;
      var s = makeSeg(prev, x, y, Math.atan2(ty - y, tx - x), Math.hypot(tx - x, ty - y), 3 + i, grp, prev ? null : rand(0.3, 1), { z: (1 + h.z) / 2 });
      s.bridge = true;
      segs.push(s); prev = s; x = s.x1; y = s.y1;
    }
  }

  function generate() {
    segs = []; grown = []; buckets = []; bucketMap = {}; dots = []; dotMap = {};
    var max = mobile ? CONFIG.uzlyMobil : CONFIG.uzlyDesktop;
    extraBudget = Math.round(max * 0.3);
    var hubs = makeHubs();
    hubs.forEach(function (h) {
      if (!h.main) connect(h, hubs[0]);
      if (h.core) { growHub(h, Math.round(max * h.share)); return; }
      growHub(h, Math.round(max * h.share));
    });
    segs.forEach(function (s) { if (s.parent) s.parent.leaf = false; });
    balanceColors();
    segs.forEach(function (s) {
      if (!s.group.type) s.alpha *= 0.6; // výplň bez popisku je průhlednější
      if (s.hub.core) s.alpha *= 0.55;   // husté jádro – ať se při sčítání barev nepřepálí do bílé
      makeNode(s); addToBucket(s);
    });
  }

  // Rozdělí souvislé úseky stejné barvy mezi barevné skupiny tak, aby podíl „inkoustu“
  // (délka × tloušťka) odpovídal vahám z palety. Záře se nepočítá – červená je plochou malá, ale svítí.
  function balanceColors() {
    var runs = [], total = 0;
    segs.forEach(function (s) {
      if (s.bridge) return;
      if (s.parent && !s.parent.bridge && s.parent.group === s.group && s.parent.run) s.run = s.parent.run;
      else { s.run = { segs: [], ink: 0 }; runs.push(s.run); }
      var ink = s.len * s.width * (s.leaf && s.group.nodes ? 1.15 : 1);
      s.run.segs.push(s); s.run.ink += ink; total += ink;
    });
    var wsum = groups.reduce(function (a, g) { return a + g.weight; }, 0) || 1;
    var left = groups.map(function (g) { return g.weight / wsum * total; });
    runs.sort(function (a, b) { return b.ink - a.ink; });
    runs.forEach(function (r) {
      var best = 0;
      for (var i = 1; i < groups.length; i++) if (left[i] > left[best]) best = i;
      left[best] -= r.ink;
      var g = groups[best];
      r.segs.forEach(function (s) { s.group = g; s.rgb = pick(g.shades); });
    });
  }

  // při „nárazu“ síť zhoustne – z existujících uzlů vyraší nové červené výhonky
  function sprout(count) {
    if (reduced) return;
    var red = groupOfType("extremismus");
    for (var i = 0; i < count && extraBudget > 0 && grown.length; i++) {
      var p = pick(grown).seg;
      if (p.depth < 2) continue;
      var grp = Math.random() < 0.5 ? red : p.group;
      var s = makeSeg(p, p.x1, p.y1, p.a + rand(-1, 1), p.len * rand(0.4, 0.8), p.depth + 1, grp, G + rand(0, 0.8), p.hub);
      s.alpha = Math.min(0.7, s.alpha + 0.1);
      makeNode(s);
      segs.push(s);
      addToBucket(s);
      extraBudget--;
    }
  }

  /* ---------- růst + vlnění ---------- */

  function grow() {
    for (var k = 0; k < segs.length; k++) {
      var s = segs[k];
      if (!s.started && G > s.start) s.started = true;
      if (s.started && !s.done && G >= s.start + s.dur) { s.done = true; if (s.node) addDot(s.node); }
    }
  }

  function addDot(n) {
    grown.push(n);
    // vnitřní uzly bez výrazné záře se nekreslí (jsou pod 1 px), jen slouží signálům a najetí
    if (!n.seg.leaf && !n.milky) return;
    var key = n.rgb.join(",");
    var b = dotMap[key];
    if (!b) { b = dotMap[key] = { rgb: n.rgb, list: [] }; dots.push(b); }
    b.list.push(n);
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

  /* ---------- chomáče (chmýří) ---------- */

  function toLocal(x, y) {
    var c = Math.cos(-rot), s = Math.sin(-rot), dx = (x - W / 2) / sc, dy = (y - H / 2) / sc;
    return [dx * c - dy * s, dx * s + dy * c];
  }

  function spawnTuft() {
    var m = Math.min(W, H), k = Math.min(1.2, Math.max(0.7, m / 800));
    var sx = Math.min(W - 40, Math.max(40, W / 2 + gauss() * m * CONFIG.chomacRozptyl * 2));
    var sy = Math.min(H - 40, Math.max(40, H / 2 + gauss() * m * CONFIG.chomacRozptyl * 1.6));
    var p = toLocal(sx, sy), cols = [pickGroup(PAL.tuftBias), pickGroup(PAL.tuftBias)];
    var hairs = [], n = randInt(CONFIG.chomacLinek[0], CONFIG.chomacLinek[1]);
    for (var i = 0; i < n; i++) {
      var g = cols[i % 2];
      hairs.push({
        a: rand(0, Math.PI * 2), len: rand(8, 36) * k, curl: rand(-0.7, 0.7),
        thin: Math.random() < 0.5, c: i % 2, seed: Math.random() * 100, spd: rand(0.8, 1.6),
      });
    }
    tufts.push({
      x: p[0], y: p[1], hairs: hairs,
      rgb: [pick(cols[0].shades), pick(cols[1].shades)],
      tips: [cols[0].milky || cols[0].key === "bila", cols[1].milky || cols[1].key === "bila"],
      t: 0, grow: rand(1, 1.6), life: rand(2, 4), fade: rand(1.2, 2),
    });
  }

  function updateTufts(dt) {
    if (reduced) return;
    nextTuft -= dt;
    if (nextTuft <= 0) {
      if (tufts.length < CONFIG.chomacMax[mobile ? 0 : 1]) spawnTuft();
      nextTuft = rand(CONFIG.chomacInterval[0], CONFIG.chomacInterval[1]);
    }
    tufts.forEach(function (t) { t.t += dt; });
    tufts = tufts.filter(function (t) { return t.t < t.grow + t.life + t.fade; });
  }

  function drawTufts(alpha) {
    var jAmp = CONFIG.chveni * chaosLevel * 2;
    tufts.forEach(function (t) {
      var p = Math.min(1, t.t / t.grow);
      p = 1 - (1 - p) * (1 - p);
      var fade = t.t < t.grow + t.life ? 1 : Math.max(0, 1 - (t.t - t.grow - t.life) / t.fade);
      for (var c = 0; c < 2; c++) {
        for (var w = 0; w < 2; w++) {
          ctx.beginPath();
          var tips = [];
          for (var i = 0; i < t.hairs.length; i++) {
            var h = t.hairs[i];
            if (h.c !== c || (h.thin ? 0 : 1) !== w) continue;
            var L = h.len * p, ca = Math.cos(h.a), sa = Math.sin(h.a);
            var jx = noise(jitT * h.spd + h.seed) * jAmp, jy = noise(jitT * h.spd + h.seed + 50) * jAmp;
            var ex = t.x + ca * L + jx, ey = t.y + sa * L + jy;
            ctx.moveTo(t.x, t.y);
            ctx.quadraticCurveTo(t.x + ca * L * 0.5 - sa * L * h.curl, t.y + sa * L * 0.5 + ca * L * h.curl, ex, ey);
            if (t.tips[c]) tips.push(ex, ey);
          }
          ctx.strokeStyle = rgba(t.rgb[c], 0.55 * fade * alpha);
          ctx.lineWidth = w ? 0.65 : 0.35;
          ctx.stroke();
          if (tips.length) {
            ctx.fillStyle = rgba(t.rgb[c], 0.8 * fade * alpha);
            ctx.beginPath();
            for (var j = 0; j < tips.length; j += 2) { ctx.moveTo(tips[j] + 0.8, tips[j + 1]); ctx.arc(tips[j], tips[j + 1], 0.8, 0, Math.PI * 2); }
            ctx.fill();
          }
        }
      }
    });
  }

  /* ---------- signály ---------- */

  function inwardPath(seg) { var p = []; while (seg) { p.push(seg); seg = seg.parent; } return p; }
  function pathLen(p) { return p.reduce(function (s, x) { return s + x.len; }, 0); }

  function spawnSignal(node, o) {
    var path = inwardPath(node.seg);
    if (o.out) path.reverse();
    var sig = {
      path: path, out: !!o.out, i: 0, d: 0, rgb: o.rgb || node.rgb,
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

  /* ---------- příběh (běží po hlavním středu) ---------- */

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
      if (!n.seg.hub.main || !n.label) return;
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

  function greenRgb() { return groupOfType("zajimave").shades[0]; }

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
      var leaves = grown.filter(function (n) { return n.seg.leaf && n.seg.hub.main; });
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
        s.green = pickVisibleNode("zajimave");
        if (!s.green) { s.t = 0; s.wait = 1; return; }
        showLabel(ui.green, nextLabel("zelene"), greenRgb());
        s.phase = "greenGlow"; s.t = 0;
        return;
      case "greenGlow":
        if (s.t < 1.6) return;
        s.phase = "greenTravel"; s.t = 0;
        if (reduced) arriveGreen();
        else spawnSignal(s.green, { rgb: greenRgb(), size: 2.2, trail: 12, duration: 2.6, story: true, onEnd: arriveGreen });
        return;
      case "calm":
        if (s.t < 3) return;
        s.red = pickVisibleNode("extremismus", s.green);
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
    var l = toLocal(px, py), best = null, bd = maxDist / sc;
    for (var i = 0; i < grown.length; i++) {
      var n = grown[i];
      if (!n.label) continue;
      var d = Math.hypot(n.seg.ex - l[0], n.seg.ey - l[1]);
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
    if (n) { hover = n; tapUntil = time + 2.5; showLabel(ui.hover, n.label, n.rgb); }
  }
  function onLeave() { pointer.has = false; }

  function updateHover() {
    if (time < tapUntil) return;
    if (pointer.has && frameNo % 2 === 0) hover = findNode(pointer.x, pointer.y, 14);
    else if (!pointer.has) hover = null;
    if (hover) showLabel(ui.hover, hover.label, hover.rgb);
    else hideLabel(ui.hover);
    canvas.style.cursor = hover ? "pointer" : "";
  }

  /* ---------- kreslení (aditivně: překryvy se rozsvěcují) ---------- */

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

  // záře: sprity do vrstvy v nízkém rozlišení, pak jednou přes celý obraz; ostrá jádra zvlášť
  function drawNodes(alpha) {
    var c = Math.cos(rot), s = Math.sin(rot), hw = W / 2 / sc + 60, hh = H / 2 / sc + 60;
    var gs = Math.min(1.6, Math.max(0.6, PAL.glow)), i, j, n, b, x, y, rx, ry;
    var doGlow = PAL.glow > 0 && frameNo % glowEvery === 0;
    if (doGlow) {
      var k = 1 / GLOW_RES;
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.globalCompositeOperation = "source-over";
      gctx.clearRect(0, 0, glowCv.width, glowCv.height);
      gctx.setTransform(k, 0, 0, k, W / 2 * k, H / 2 * k);
      gctx.rotate(rot);
      gctx.scale(sc, sc);
      gctx.globalCompositeOperation = "lighter";
      gctx.globalAlpha = Math.min(1, alpha * PAL.glow);
    }
    for (b = 0; b < dots.length; b++) {
      var bk = dots[b], spr = null;
      ctx.beginPath();
      for (j = 0; j < bk.list.length; j++) {
        n = bk.list[j]; x = n.seg.ex; y = n.seg.ey;
        rx = x * c - y * s; ry = x * s + y * c;
        if (rx < -hw || rx > hw || ry < -hh || ry > hh) continue; // mimo obrazovku
        var r = n.r * (n.glow > 2 ? 0.9 : 0.6);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
        if (doGlow) {
          spr = spr || sprite(n.rgb, n.milky);
          var half = n.r / CORE * (0.55 + 0.45 * n.glow) * gs;
          gctx.drawImage(spr, x - half, y - half, half * 2, half * 2);
        }
      }
      ctx.fillStyle = rgba(bk.rgb, Math.min(1, 0.95 * alpha));
      ctx.fill();
    }
    if (PAL.glow > 0) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(glowCv, 0, 0, glowCv.width * GLOW_RES, glowCv.height * GLOW_RES);
      ctx.restore();
    }
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
    ctx.globalCompositeOperation = "lighter";

    var lineA = netAlpha * (1 - P + P * Math.sin(pulseT * 1.3));
    drawLines(lineA);
    drawTufts(lineA);
    drawNodes(netAlpha * (1 - P + P * Math.sin(pulseT * 1.9 + 1.2)));

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
      var gs = story.green.seg, gp = 0.5 + 0.5 * Math.sin(time * 4), gc = greenRgb();
      glow(gs.ex, gs.ey, 18 + gp * 6, gc, 0.55);
      ctx.fillStyle = rgba(gc, 1);
      ctx.beginPath(); ctx.arc(gs.ex, gs.ey, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (story && story.red && (story.phase === "redTravel" || story.phase === "redHold")) {
      glow(story.red.seg.ex, story.red.seg.ey, 24, PAL.red, story.phase === "redTravel" ? 0.8 : 0.4);
    }
    if (hover) {
      ctx.strokeStyle = rgba(hover.rgb, 0.9);
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
    if (time > 1 && perf.checked < 4) {
      perf.n++; perf.sum += dt;
      if (perf.n >= 120) {
        if (perf.sum / perf.n > 1 / 45) {
          if (perf.checked === 0) signalTarget = Math.round(signalTarget * 0.5);
          else if (perf.checked === 1) glowEvery = 2;
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
    updateTufts(dt);
    updateHover();
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- API ---------- */

  function build() {
    setupCanvas();
    makeGrain();
    generate();
    signals = []; tufts = []; nextTuft = 1;
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
    setupPalette();
    G = 0; rot = 0; ts = 1; tsTarget = 1; netAlpha = netAlphaTarget = 1; time = 0; pulseT = 0;
    waveT = 0; jitT = 0; noiseEvery = 1; glowEvery = 1;
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
