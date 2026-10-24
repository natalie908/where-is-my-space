/* Scéna feed – skládá se z textů v content.js (OBSAH.feed). */
(function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function emptyCard(text) {
    return el("div", "card card--empty", text);
  }

  // obrázek ze screenshots/ – když neexistuje, nahradí ho prázdná karta
  function screenshotCard(src, emptyText) {
    var card = el("figure", "card");
    card.style.margin = "0 0 16px";
    var img = new Image();
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = function () { card.replaceWith(emptyCard(emptyText)); };
    img.src = src;
    card.appendChild(img);
    return card;
  }

  function eventCard(a, freeText) {
    var card = el("article", "card event");
    var h = el("h3", null, a.nazev);
    if (a.zdarma) h.appendChild(el("span", "pill", freeText));
    card.appendChild(h);
    card.appendChild(el("p", "meta", a.datum + " · " + a.misto));
    card.appendChild(el("p", null, a.veta));
    return card;
  }

  function render(root, F) {
    root.appendChild(el("h1", null, F.nadpis));
    if (F.podnadpis) root.appendChild(el("p", "lead", F.podnadpis));

    F.sekce.forEach(function (s) {
      var sec = el("section", "feed-section");
      sec.appendChild(el("h2", null, s.nazev));
      if (s.popis) sec.appendChild(el("p", null, s.popis));
      (s.screenshoty || []).forEach(function (src) {
        sec.appendChild(screenshotCard(src, F.prazdnaKarta));
      });
      (s.akce || []).forEach(function (a) {
        sec.appendChild(eventCard(a, F.zdarma));
      });
      if (!(s.screenshoty || []).length && !(s.akce || []).length) {
        sec.appendChild(emptyCard(F.prazdnaKarta));
      }
      root.appendChild(sec);
    });

    var end = el("footer", "feed-end");
    end.appendChild(el("p", null, F.konec));
    root.appendChild(end);
  }

  window.Feed = { render: render };
})();
