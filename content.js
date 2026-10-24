/*
  ============================================================
  OBSAH STRÁNKY – tady se mění všechny texty
  ============================================================
  Co se kde mění:
  + hotspoty   – poloha a velikost klikacích oblastí na videu
                 (x, y = střed v % šířky/výšky videa, velikost = průměr v % šířky).
                 Nejsnáz je doladíš přes index.html?edit – souřadnice se vypíšou
                 do konzole (F12) a stačí je sem zkopírovat.
  + chaos      – popisky koleček (velka / stredni / mala / zajimave) a věta dole.
                 Kolečka s "naraz: true" jsou ta, která vrážejí do zajímavých věcí.
                 Kolečka můžeš libovolně přidávat a mazat.
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
    // velikost kolečka = kolik pozornosti mi to bere
    velka: [
      { text: "misleading headline", naraz: true },
      { text: "rage bait", naraz: true },
      { text: "comment war", naraz: true },
      { text: "reels" },
      { text: "polarizing post", naraz: true },
    ],
    stredni: [
      { text: "ad" },
      { text: "sponsored" },
      { text: "people you may know" },
      { text: "suggested for you" },
      { text: "viral video" },
      { text: "clickbait" },
      { text: "trending" },
      { text: "influencer post" },
      { text: "shop now" },
      { text: "memories" },
      { text: "marketplace" },
      { text: "half-true infographic" },
    ],
    // drobný šum, který nic nepřináší
    mala: [
      { text: "quiz" },
      { text: "horoscope" },
      { text: "giveaway" },
      { text: "game invite" },
      { text: "celebrity gossip" },
      { text: "life hack" },
      { text: "recipe video" },
      { text: "crypto ad" },
      { text: "notification" },
      { text: "meme" },
      { text: "poll" },
      { text: "live video" },
      { text: "dropshipping ad" },
      { text: "fake discount" },
    ],
    // malé, ale zajímavé – tyhle doplavou do středu a pak je něco velkého vytlačí
    zajimave: [
      { text: "yoga event in Brno" },
      { text: "photo from a friend" },
      { text: "interesting article" },
      { text: "festival" },
      { text: "lecture" },
      { text: "design meetup" },
    ],
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
        screenshoty: ["screenshots/oblibene-1.jpg", "screenshots/oblibene-2.jpg", "screenshots/oblibene-3.jpg"],
      },
      {
        nazev: "Skupiny",
        popis: "",
        screenshoty: ["screenshots/skupiny-1.png"],
      },
      {
        nazev: "Události",
        popis: "",
        screenshoty: ["screenshots/udalosti-1.jpg", "screenshots/udalosti-2.jpg", "screenshots/udalosti-3.jpg"],
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
    konec: "To je vše. Můžeš jít ven.",
  },
};
