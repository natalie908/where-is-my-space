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

  function arrowUp() {
    return svg(14, 22, '<path d="M7 21 V2 M1 8 L7 2 L13 8" stroke-width="1"/>');
  }

  /* ---------- karty ---------- */

  function initials(name) {
    var w = name.split(/[\s.\-–]+/).filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0, 2)).toUpperCase();
  }

  // příspěvek jako FB šablona: kolečko s iniciálami, jméno, čas · kde, text, fotka, reakce
  function postCard(p, F) {
    var card = el("article", "card post");
    var head = el("header", "post-head");
    head.appendChild(el("span", "avatar", initials(p.autor)));
    var who = el("div");
    who.appendChild(el("h3", null, p.autor));
    who.appendChild(el("div", "meta", [p.cas, p.kde].filter(Boolean).join(" · ")));
    head.appendChild(who);
    card.appendChild(head);
    if (p.text) card.appendChild(el("p", "post-text", p.text));
    if (p.foto) {
      // fotka: vybělená, klepnutí přepne na barvy a zpět
      card.classList.add("shot");
      var wrap = el("div", "shot-img");
      var img = new Image();
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = function () { wrap.remove(); card.classList.remove("shot"); };
      img.src = p.foto;
      wrap.appendChild(img);
      if (F.tapBarva) wrap.appendChild(el("span", "shot-hint", F.tapBarva));
      card.appendChild(wrap);
      card.addEventListener("click", function () { card.classList.toggle("is-color"); });
    }
    if (p.reakce) card.appendChild(el("div", "post-foot", p.reakce));
    return card;
  }

  function emptyCard(text) {
    var card = el("div", "card");
    card.appendChild(el("div", "shot-empty", text));
    return card;
  }

  function eventCard(a, freeText) {
    var card = el("article", "card event");
    var head = el("header", "event-head");
    head.appendChild(el("h3", null, a.nazev));
    if (a.zdarma) head.appendChild(el("span", "pill", freeText));
    card.appendChild(head);
    card.appendChild(el("div", "meta", [a.datum, a.misto].filter(Boolean).join(" · ")));
    card.appendChild(el("p", null, a.veta));
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
    if (F.nadpis) root.appendChild(title(F.nadpis));

    var meta = el("div", "feed-meta");
    meta.appendChild(compass(34));
    meta.appendChild(el("span", null, F.souradnice || ""));
    meta.appendChild(el("span", null, "Brno"));
    root.appendChild(meta);
    if (F.podnadpis) root.appendChild(el("p", "lead", F.podnadpis));

    F.sekce.forEach(function (s, i) {
      var sec = el("section", "feed-section");
      sec.appendChild(el("span", "feed-tag", String(i + 1).padStart(2, "0") + " — " + s.nazev));
      if (s.popis) sec.appendChild(el("p", null, s.popis));
      (s.prispevky || []).forEach(function (p) {
        sec.appendChild(postCard(p, F));
      });
      (s.akce || []).forEach(function (a) {
        sec.appendChild(eventCard(a, F.zdarma));
      });
      if (!(s.prispevky || []).length && !(s.akce || []).length) {
        sec.appendChild(emptyCard(F.prazdnaKarta));
      }
      root.appendChild(sec);
    });

    var end = el("footer", "feed-end");
    end.appendChild(contours(480, 110));
    end.appendChild(el("div", "rule"));
    if (F.konec) end.appendChild(el("p", null, F.konec));
    if (F.souradnice) end.appendChild(el("div", "coords", F.souradnice));
    var up = el("a", "feed-up");
    up.href = "#";
    up.setAttribute("data-back", "");
    up.appendChild(arrowUp());
    up.appendChild(el("span", null, F.nahoru || ""));
    end.appendChild(up);
    root.appendChild(end);
  }

  window.Feed = { render: render };
})();
