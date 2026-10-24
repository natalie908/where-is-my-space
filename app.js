/* Úvodní scéna, přepínání scén a režim ?edit. Texty jsou v content.js. */
(function () {
  "use strict";

  var O = window.OBSAH;
  var VIDEO_W = 3718, VIDEO_H = 2230; // poměr stran videa strom.mp4
  var EDIT = /[?&]edit\b/.test(location.search);
  var FADE_MS = 600;

  var stage = document.getElementById("stage");
  var video = document.getElementById("video");
  var hotspots = Array.prototype.slice.call(document.querySelectorAll(".hotspot"));
  var current = null;
  var navigatedInApp = false;

  /* ---------- texty ---------- */

  document.querySelectorAll("#chaos [data-back]").forEach(function (a) { a.textContent = O.chaos.zpet; });
  document.querySelectorAll("#feed [data-back]").forEach(function (a) { a.textContent = O.feed.zpet; });
  // věta dole: *slovo* se zvýrazní barvou z palety
  var chaosLine = document.getElementById("chaos-line");
  (O.chaos.vetaDole || "").split(/(\*[^*]+\*)/).forEach(function (part) {
    if (!part) return;
    if (/^\*[^*]+\*$/.test(part)) {
      var hl = document.createElement("span");
      hl.className = "hl";
      hl.textContent = part.slice(1, -1);
      chaosLine.appendChild(hl);
    } else {
      chaosLine.appendChild(document.createTextNode(part));
    }
  });
  var pal = O.chaos.paleta || {};
  var chaosScene = document.getElementById("chaos");
  if (pal.pozadi) chaosScene.style.setProperty("--chaos-bg", pal.pozadi);
  if (pal.text) chaosScene.style.setProperty("--chaos-text", pal.text);
  if (pal.zvyrazneni) chaosScene.style.setProperty("--chaos-hl", pal.zvyrazneni);

  /* ---------- PNG koláž nad videem ---------- */

  var overlay = document.getElementById("overlay");
  function checkOverlay() {
    var ratio = overlay.naturalWidth / overlay.naturalHeight;
    if (Math.abs(ratio - VIDEO_W / VIDEO_H) > 0.01) {
      console.warn("kolaz.png má jiný poměr stran (" + overlay.naturalWidth + " × " + overlay.naturalHeight +
        ") než video (" + VIDEO_W + " × " + VIDEO_H + ") – nebude přesně sedět.");
    }
  }
  overlay.addEventListener("error", function () { overlay.classList.add("is-missing"); });
  if (overlay.complete && !overlay.naturalWidth) overlay.classList.add("is-missing");
  else if (overlay.complete) checkOverlay();
  else overlay.addEventListener("load", checkOverlay);
  window.Feed.render(document.getElementById("feed-content"), O.feed);

  /* ---------- klikací oblasti ---------- */

  function placeHotspots() {
    hotspots.forEach(function (el) {
      var h = O.hotspoty[el.dataset.key];
      el.style.left = h.x + "%";
      el.style.top = h.y + "%";
      el.style.width = h.velikost + "%";
      el.setAttribute("aria-label", h.popis);
      if (EDIT) el.querySelector(".hotspot-label").textContent =
        el.dataset.key + "  x " + h.x + "  y " + h.y + "  ⌀ " + h.velikost;
    });
  }

  /*
    Video vyplní obrazovku (jako object-fit: cover), ale posune se tak,
    aby slunce i planetka zůstaly vidět. Když to nejde (mobil na výšku),
    video se zmenší jen tolik, kolik je nutné – zbytek vyplní rozmazané pozadí.
    Klikací oblasti jsou v % uvnitř .stage, takže vždy sedí na video.
  */
  function layoutStage() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var ar = VIDEO_W / VIDEO_H;
    var coverW = Math.max(vw, vh * ar);
    var containW = Math.min(vw, vh * ar);
    var spots = Object.keys(O.hotspoty).map(function (k) { return O.hotspoty[k]; });

    function fit(w) {
      var h = w / ar;
      var range = function (size, view, axis) {
        // povolený posun videa: nesmí vzniknout okraj, pokud je video větší než okno
        var lo = Math.min(0, view - size), hi = Math.max(0, view - size);
        if (size <= view) { lo = hi = (view - size) / 2; }
        spots.forEach(function (s) {
          var r = (s.velikost / 100) * w / 2;
          var m = r * 0.25 + 4;
          var p = (axis === "x" ? s.x : s.y) / 100 * size;
          lo = Math.max(lo, r + m - p);
          hi = Math.min(hi, view - p - r - m);
        });
        if (lo > hi) return null;
        var center = (view - size) / 2;
        return Math.min(hi, Math.max(lo, center));
      };
      var x = range(w, vw, "x"), y = range(h, vh, "y");
      return x === null || y === null ? null : { w: w, h: h, x: x, y: y };
    }

    var best = fit(coverW);
    if (!best) {
      var lo = containW, hi = coverW;
      best = fit(lo) || { w: containW, h: containW / ar, x: (vw - containW) / 2, y: (vh - containW / ar) / 2 };
      for (var i = 0; i < 18; i++) {
        var mid = (lo + hi) / 2, f = fit(mid);
        if (f) { best = f; lo = mid; } else { hi = mid; }
      }
    }
    stage.style.width = best.w + "px";
    stage.style.height = best.h + "px";
    stage.style.left = best.x + "px";
    stage.style.top = best.y + "px";
    stage.classList.toggle("is-letterbox", best.h < vh - 1);
  }

  hotspots.forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (EDIT) { e.preventDefault(); return; }
      go(el.dataset.target);
    });
  });

  /* ---------- režim ?edit ---------- */

  function printCoords() {
    var h = O.hotspoty;
    var line = function (k) {
      return "    " + (k + ":").padEnd(10) + "{ x: " + h[k].x + ", y: " + h[k].y +
        ", velikost: " + h[k].velikost + ", popis: " + JSON.stringify(h[k].popis) + " },";
    };
    console.log("%cZkopíruj do content.js (místo bloku hotspoty):", "font-weight:bold",
      "\n  hotspoty: {\n" + Object.keys(h).map(line).join("\n") + "\n  },");
  }

  function setupEdit() {
    document.body.classList.add("is-edit");
    var note = document.createElement("div");
    note.className = "edit-note";
    note.textContent = "Režim úprav: táhni kolečka myší · kolečko myši / klávesy + − mění velikost · souřadnice v konzoli (F12)";
    document.body.appendChild(note);

    var round = function (n) { return Math.round(n * 10) / 10; };
    var hovered = null;

    hotspots.forEach(function (el) {
      var label = document.createElement("span");
      label.className = "hotspot-label";
      el.appendChild(label);
      var key = el.dataset.key;

      el.addEventListener("pointerenter", function () { hovered = key; });
      el.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        hovered = key;
      });
      el.addEventListener("pointermove", function (e) {
        if (!el.classList.contains("is-dragging")) return;
        var r = stage.getBoundingClientRect();
        O.hotspoty[key].x = round((e.clientX - r.left) / r.width * 100);
        O.hotspoty[key].y = round((e.clientY - r.top) / r.height * 100);
        placeHotspots();
      });
      var end = function () {
        if (!el.classList.contains("is-dragging")) return;
        el.classList.remove("is-dragging");
        printCoords();
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        resize(key, e.deltaY < 0 ? 0.2 : -0.2);
      }, { passive: false });
    });

    function resize(key, d) {
      var h = O.hotspoty[key];
      h.velikost = Math.max(1, round(h.velikost + d));
      placeHotspots();
      clearTimeout(resize.t);
      resize.t = setTimeout(printCoords, 400);
    }
    document.addEventListener("keydown", function (e) {
      if (!hovered) return;
      if (e.key === "+" || e.key === "=") resize(hovered, 0.2);
      if (e.key === "-") resize(hovered, -0.2);
    });
    printCoords();
  }

  /* ---------- přepínání scén ---------- */

  function sceneFromHash() {
    var h = location.hash.replace("#", "");
    return h === "chaos" || h === "feed" ? h : "intro";
  }

  function show(name, instant) {
    if (name === current) return;
    var prev = current;
    current = name;

    document.querySelectorAll(".scene").forEach(function (s) {
      if (instant) s.style.transition = "none";
      s.classList.toggle("is-active", s.id === name);
      if (instant) { void s.offsetWidth; s.style.transition = ""; }
    });

    if (name === "intro") {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      video.pause();
    }

    if (name === "chaos") window.Chaos.start(document.getElementById("chaos-canvas"), O.chaos);
    else if (prev === "chaos") setTimeout(function () { if (current !== "chaos") window.Chaos.stop(); }, instant ? 0 : FADE_MS);

    var line = document.getElementById("chaos-line");
    clearTimeout(show.lineTimer);
    line.classList.remove("is-visible");
    if (name === "chaos" && line.textContent) show.lineTimer = setTimeout(function () { line.classList.add("is-visible"); }, 6000);

    if (name === "feed") document.getElementById("feed").scrollTop = 0;
  }

  function go(name) {
    navigatedInApp = true;
    location.hash = name;
  }

  function back() {
    if (current === "intro") return;
    if (navigatedInApp) { navigatedInApp = false; history.back(); return; }
    location.hash = "";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    show("intro");
  }

  document.querySelectorAll("[data-back]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); back(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") back();
  });
  window.addEventListener("hashchange", function () { show(sceneFromHash()); });

  /* ---------- start ---------- */

  if (EDIT) setupEdit();
  placeHotspots();
  layoutStage();
  window.addEventListener("resize", layoutStage);
  window.addEventListener("orientationchange", function () { setTimeout(layoutStage, 200); });
  show(sceneFromHash(), true);

  // video se po návratu do záložky někdy samo nespustí (iOS)
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && current === "intro") {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
  });
})();
