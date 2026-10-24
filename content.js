/*
  ============================================================
  OBSAH STRÁNKY – tady se mění všechny texty
  ============================================================
  Co se kde mění:
  + hotspoty   – poloha a velikost klikacích oblastí na videu
                 (x, y = střed v % šířky/výšky videa, velikost = průměr v % šířky).
                 Nejsnáz je doladíš přes index.html?edit – souřadnice se vypíšou
                 do konzole (F12) a stačí je sem zkopírovat.
  + chaos      – typy obsahu v síti (barva, velikost tečky, četnost, popisky),
                 popisky pro příběh (zelené / červené) a věta dole.
                 Technické ladění sítě (počet větví, rychlost…) je v chaos.js nahoře.
  + feed       – nadpis, sekce, popisky, screenshoty, akce týdne, závěrečná věta.
                 Screenshoty: nahraj obrázek do složky screenshots/ se stejným
                 názvem, jaký je tady v seznamu. Když obrázek chybí, ukáže se
                 prázdná karta "sem přijde screenshot".
  Pravidla: texty jsou v uvozovkách "…", za každou položkou čárka.
  ============================================================
*/

window.OBSAH = {

  hotspoty: {
    slunce:   { x: 28.3, y: 58.6, velikost: 5.6, popis: "Otevřít chaos" },
    planetka: { x: 87.8, y: 9.6,  velikost: 7.0, popis: "Otevřít můj feed" },
  },

  chaos: {
    // Typy obsahu v síti. barva = barva větví a teček, velikost = poloměr tečky
    // (kolik pozornosti to bere), cetnost = jak často se typ v síti objevuje,
    // popisky = co se ukáže po najetí / klepnutí na tečku.
    // Názvy typů (cervena, zelena…) neměň – podle nich funguje příběh.
    typy: {
      cervena: { barva: "#FF3B3B", velikost: 2.8, cetnost: 22,
        popisky: ["rage bait", "polarizing post", "political outrage", "misleading headline", "comment war"] },
      zluta:   { barva: "#FFE14D", velikost: 2.1, cetnost: 22,
        popisky: ["reels", "viral video", "trending", "meme", "live video", "celebrity gossip"] },
      ruzova:  { barva: "#FF7EC8", velikost: 1.9, cetnost: 22,
        popisky: ["ad", "sponsored", "shop now", "crypto ad", "fake discount", "giveaway", "influencer post"] },
      modra:   { barva: "#4D6BFF", velikost: 1.6, cetnost: 18,
        popisky: ["suggested for you", "suggested page", "quiz", "horoscope", "game invite", "memories"] },
      azurova: { barva: "#4DE1FF", velikost: 1.4, cetnost: 14,
        popisky: ["people you may know", "friend suggestion", "follow suggestion"] },
      zelena:  { barva: "#3DFF9A", velikost: 1.2, cetnost: 4,
        popisky: ["yoga event in Brno", "photo from a friend", "interesting article", "festival", "lecture", "design meetup"] },
    },

    // Příběh (každých ~12 s): zelená věc doputuje do středu, pak ji přebije červená.
    // Popisky se v každém kole střídají po řadě.
    pribeh: {
      zelene: ["yoga event in Brno", "photo from a friend", "interesting article", "festival", "lecture", "design meetup"],
      cervene: ["extremist political content", "rage bait", "misleading headline", "polarizing post", "comment war"],
    },

    vetaDole: "", // věta, která se po 6 s objeví dole – prázdné = žádná věta
    zpet: "← zpět",
  },

  feed: {
    nadpis: "where is my space?",
    podnadpis: "", // prázdné = žádný popisek
    zpet: "← zpět",

    sekce: [
      {
        nazev: "Oblíbené",
        popis: "",
        screenshoty: [
          "screenshots/oblibene-1.jpg",
          "screenshots/udalosti-2.jpg",
          "screenshots/oblibene-2.jpg",
          "screenshots/udalosti-1.jpg",
          "screenshots/udalosti-3.jpg",
          "screenshots/oblibene-3.jpg",
        ],
      },
      {
        nazev: "Akce týdne (agent)",
        popis: "Jednou týdně mi AI agent vybere akce v Brně podle mých témat (technologie, jóga, festivaly, design, přednášky). Preferuje akce zdarma.",
        screenshoty: [],
        akce: [
          { nazev: "Ranní jóga v parku", datum: "so 9:00", misto: "Lužánky", veta: "Hodina pro začátečníky pod širým nebem, stačí vlastní podložka.", zdarma: true },
          { nazev: "Meetup: AI a design", datum: "čt 18:30", misto: "Impact Hub Brno", veta: "Krátké talky o tom, jak designéři reálně používají AI nástroje.", zdarma: true },
          { nazev: "Přednáška o pozornosti", datum: "út 19:00", misto: "Knihovna Jiřího Mahena", veta: "Jak aplikace soutěží o náš čas a co s tím dělat.", zdarma: true },
          { nazev: "Malý festival na dvoře", datum: "ne 14:00", misto: "Kabinet múz", veta: "Hudba, bazar a workshopy pro děti i dospělé.", zdarma: false },
        ],
      },
    ],

    prazdnaKarta: "sem přijde screenshot",
    zdarma: "zdarma",
    konec: "", // věta na úplném konci feedu – prázdné = žádný konec
  },
};
