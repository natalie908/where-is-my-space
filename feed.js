/* Scéna feed – skládá se z textů v content.js (OBSAH.feed). Vzhled: style.css, část „3) feed“. */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svg(w, h, inner, cls) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 " + w + " " + h);
    s.setAttribute("width", w);
    s.setAttribute("height", h);
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = inner;
    return s;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------- dekorace (generované, bílé linky) ---------- */

  // kompas: kruh, rysky a šipka k severu
  function compass(size) {
    var c = size / 2, r = c - 2, out = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" stroke-width="1"/>';
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2, l = i % 4 ? 3 : 6;
      out += '<line x1="' + f(c + Math.sin(a) * r) + '" y1="' + f(c - Math.cos(a) * r) + '" x2="' + f(c + Math.sin(a) * (r - l)) + '" y2="' + f(c - Math.cos(a) * (r - l)) + '" stroke-width="1"/>';
    }
    out += '<path d="M' + c + ' ' + (c - r + 8) + ' L' + (c + 4) + ' ' + c + ' L' + c + ' ' + (c + r - 8) + ' L' + (c - 4) + ' ' + c + ' Z" stroke-width="1"/>';
    out += '<path d="M' + c + ' ' + (c - r + 8) + ' L' + (c + 4) + ' ' + c + ' L' + (c - 4) + ' ' + c + ' Z" fill="currentColor" stroke="none"/>';
    return svg(size, size, out);
  }

  // vrstevnice: soustředné nepravidelné křivky kolem dvou „kopců“
  function contours(w, h) {
    var out = "";
    [[w * rand(0.25, 0.4), h * 0.55, 7], [w * rand(0.68, 0.8), h * 0.45, 5]].forEach(function (hill) {
      var ph = [rand(0, 6), rand(0, 6), rand(0, 6)];
      for (var k = 1; k <= hill[2]; k++) {
        var base = k * h * 0.11, d = "";
        for (var i = 0; i <= 72; i++) {
          var a = i / 72 * Math.PI * 2;
          var r = base * (1 + 0.16 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1] + k * 0.2) + 0.05 * Math.sin(7 * a + ph[2]));
          d += (i ? "L" : "M") + f(hill[0] + Math.cos(a) * r * 1.6) + " " + f(hill[1] + Math.sin(a) * r);
        }
        out += '<path d="' + d + 'Z" stroke-width="' + (k === hill[2] ? 1 : 0.7) + '" opacity="' + (0.35 + 0.65 * k / hill[2]) + '"/>';
      }
    });
    return svg(w, h, out, "feed-divider");
  }

  // graf ve tvaru hor: hřeben, základní osa a rysky
  function mountains(w, h) {
    var pts = [], n = 28, y;
    for (var i = 0; i <= n; i++) {
      var x = i / n * w, t = i / n;
      y = h * 0.85 - (Math.sin(t * Math.PI) * 0.55 + Math.sin(t * 9 + 1) * 0.12 + Math.sin(t * 23) * 0.05) * h * 0.8;
      pts.push(f(x) + "," + f(Math.max(4, y)));
    }
    var out = '<polyline points="' + pts.join(" ") + '" stroke-width="1"/>';
    out += '<line x1="0" y1="' + f(h * 0.9) + '" x2="' + w + '" y2="' + f(h * 0.9) + '" stroke-width="1"/>';
    for (i = 0; i <= 10; i++) {
      var tx = f(i / 10 * (w - 1) + 0.5);
      out += '<line x1="' + tx + '" y1="' + f(h * 0.9) + '" x2="' + tx + '" y2="' + f(h * 0.9 + (i % 5 ? 3 : 6)) + '" stroke-width="1"/>';
    }
    return svg(w, h, out, "feed-ridge");
  }

  function arrowUp() {
    return svg(14, 22, '<path d="M7 21 V2 M1 8 L7 2 L13 8" stroke-width="1"/>');
  }

  /* ---------- karty ---------- */

  function cells(list, cls) {
    var row = el("div", "cells" + (cls ? " " + cls : ""));
    list.forEach(function (c) {
      var cell = el("div", "cell" + (c.wide ? " cell--wide" : ""));
      if (c.node) cell.appendChild(c.node); else cell.textContent = c.text;
      row.appendChild(cell);
    });
    return row;
  }

  // screenshot: vybělený, klepnutí přepne na barvy a zpět
  function screenshotCard(src, idx, total, sectionName, F) {
    var card = el("figure", "card shot");
    card.style.margin = "";
    card.appendChild(cells([
      { text: String(idx).padStart(2, "0") + "/" + String(total).padStart(2, "0") },
      { text: sectionName },
      { text: F.tapBarva || "" },
    ], "cells--3 cells--small"));
    var wrap = el("div", "shot-img");
    var img = new Image();
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = function () { wrap.replaceWith(el("div", "shot-empty", F.prazdnaKarta)); };
    img.src = src;
    wrap.appendChild(img);
    card.appendChild(wrap);
    card.addEventListener("click", function () { card.classList.toggle("is-color"); });
    return card;
  }

  function emptyCard(text) {
    var card = el("div", "card");
    card.appendChild(el("div", "shot-empty", text));
    return card;
  }

  function eventCard(a, freeText) {
    var card = el("article", "card event");
    card.appendChild(cells([
      { node: el("h3", null, a.nazev) },
      a.zdarma ? { node: el("span", "pill", freeText) } : { text: "—" },
    ]));
    card.appendChild(cells([{ text: a.datum }, { text: a.misto }], "cells--small"));
    card.appendChild(cells([{ text: a.veta, wide: true }]));
    return card;
  }

  /* ---------- stránka ---------- */

  function title(text) {
    var h1 = el("h1", "feed-title");
    h1.setAttribute("aria-label", text);
    var words = text.split(/\s+/), half = Math.ceil(words.length / 2);
    [words.slice(0, half).join(" "), words.slice(half).join(" ")].forEach(function (line) {
      if (!line) return;
      var row = el("span", "row");
      row.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(line, function (ch) { row.appendChild(el("span", null, ch === " " ? " " : ch)); });
      h1.appendChild(row);
    });
    return h1;
  }

  function render(root, F) {
    root.appendChild(title(F.nadpis));

    var meta = el("div", "feed-meta");
    meta.appendChild(compass(34));
    meta.appendChild(el("span", null, F.souradnice || ""));
    meta.appendChild(el("span", null, "Brno"));
    root.appendChild(meta);
    if (F.podnadpis) root.appendChild(el("p", "lead", F.podnadpis));

    var total = F.sekce.reduce(function (s, x) { return s + (x.screenshoty || []).length; }, 0), shotNo = 0;

    F.sekce.forEach(function (s, i) {
      if (i > 0) root.appendChild(contours(480, 110));
      var sec = el("section", "feed-section");
      sec.appendChild(el("span", "feed-tag", String(i + 1).padStart(2, "0") + " — " + s.nazev));
      if (s.popis) sec.appendChild(el("p", null, s.popis));
      (s.screenshoty || []).forEach(function (src) {
        sec.appendChild(screenshotCard(src, ++shotNo, total, s.nazev, F));
      });
      (s.akce || []).forEach(function (a) {
        sec.appendChild(eventCard(a, F.zdarma));
      });
      if (!(s.screenshoty || []).length && !(s.akce || []).length) {
        sec.appendChild(emptyCard(F.prazdnaKarta));
      }
      root.appendChild(sec);
    });

    if (F.konec) {
      var end = el("footer", "feed-end");
      end.appendChild(mountains(480, 60));
      end.appendChild(el("div", "rule"));
      end.appendChild(el("p", null, F.konec));
      if (F.souradnice) end.appendChild(el("div", "coords", F.souradnice));
      var up = el("a", "feed-up");
      up.href = "#";
      up.setAttribute("data-back", "");
      up.appendChild(arrowUp());
      up.appendChild(el("span", null, F.nahoru || ""));
      end.appendChild(up);
      root.appendChild(end);
    }
  }

  window.Feed = { render: render };
})();
