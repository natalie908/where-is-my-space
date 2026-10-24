/* Scéna feed – skládá se z textů v content.js (OBSAH.feed). Vzhled: style.css, část „3) feed“. */
(function () {
  "use strict";


  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
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
    var av = el("span", "avatar");
    if (p.profilovka) {
      av.classList.add("avatar--pic");
      var pic = new Image();
      pic.alt = "";
      pic.src = p.profilovka;
      pic.onerror = function () { pic.remove(); av.classList.remove("avatar--pic"); av.textContent = initials(p.autor); };
      av.appendChild(pic);
    } else {
      av.textContent = initials(p.autor);
    }
    head.appendChild(av);
    var who = el("div");
    who.appendChild(el("h3", null, p.autor));
    who.appendChild(el("div", "meta", [p.cas, p.kde].filter(Boolean).join(" · ")));
    head.appendChild(who);
    card.appendChild(head);
    if (p.text) card.appendChild(el("p", "post-text", p.text));
    var fotos = [].concat(p.foto || []).filter(Boolean);
    if (fotos.length) {
      // fotky: vybělené, klepnutí přepne na barvy a zpět
      card.classList.add("shot");
      fotos.forEach(function (src) {
        var wrap = el("div", "shot-img" + (p.cela ? " shot-img--full" : ""));
        var img = new Image();
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.onerror = function () { wrap.remove(); };
        img.src = src;
        wrap.appendChild(img);
        card.appendChild(wrap);
      });
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

  // screenshot bez karty (průhledný); klepnutí ho zvětší s původním černým pozadím
  function screenFigure(o) {
    var fig = el("figure", "screen");
    var img = new Image();
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = o.src;
    fig.appendChild(img);
    fig.setAttribute("role", "button");
    fig.setAttribute("tabindex", "0");
    fig.setAttribute("aria-label", "Zvětšit");
    var open = function () { lightbox(o.velky || o.src); };
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    return fig;
  }

  // zvětšený obrázek přes celou obrazovku; zavře se klepnutím nebo Esc
  var box = null;
  function lightbox(src) {
    if (!box) {
      box = el("div", "lightbox");
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-label", "Zvětšený obrázek");
      box.appendChild(el("button", "lightbox-close", "×"));
      box.appendChild(new Image());
      box.addEventListener("click", closeBox);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && box.classList.contains("is-open")) { e.stopImmediatePropagation(); closeBox(); }
      }, true);
      document.body.appendChild(box);
    }
    box.querySelector("img").src = src;
    box.scrollTop = 0;
    box.classList.add("is-open");
  }
  function closeBox() { box.classList.remove("is-open"); }

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

    if (F.podnadpis) root.appendChild(el("p", "lead", F.podnadpis));

    F.sekce.forEach(function (s, i) {
      var sec = el("section", "feed-section");
      sec.appendChild(el("span", "feed-tag", String(i + 1).padStart(2, "0") + " — " + s.nazev));
      if (s.popis) sec.appendChild(el("p", null, s.popis));
      (s.prispevky || []).forEach(function (p) {
        sec.appendChild(postCard(p, F));
      });
      (s.obrazky || []).forEach(function (o) {
        sec.appendChild(screenFigure(o));
      });
      (s.akce || []).forEach(function (a) {
        sec.appendChild(eventCard(a, F.zdarma));
      });
      if (!(s.prispevky || []).length && !(s.akce || []).length && !(s.obrazky || []).length) {
        sec.appendChild(emptyCard(F.prazdnaKarta));
      }
      root.appendChild(sec);
    });

    if (F.konec) {
      var end = el("footer", "feed-end");
      end.appendChild(el("p", null, F.konec));
      root.appendChild(end);
    }
  }

  window.Feed = { render: render };
})();
