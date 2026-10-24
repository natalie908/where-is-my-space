/*
  ============================================================
  OBSAH STRÁNKY – tady se mění všechny texty
  ============================================================
  Co se kde mění:
  + hotspoty   – poloha a velikost klikacích oblastí na videu
                 (x, y = střed v % šířky/výšky videa, velikost = průměr v % šířky).
                 Nejsnáz je doladíš přes index.html?edit – souřadnice se vypíšou
                 do konzole (F12) a stačí je sem zkopírovat.
  + chaos      – paleta (váhy barev, záře), typy obsahu (velikost tečky, popisky),
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
    // PALETA – všechny barvy scény chaos na jednom místě
    paleta: {
      pozadi: "#0A090B",       // teplá černá
      zrno: 0.06,              // síla filmového zrna a škrábanců (0 = vypnuto)

      // Barevné skupiny. vaha = podíl barevné plochy v síti (v %),
      // barvy = odstíny skupiny, typ = jaký obsah barva znamená (popisek po najetí),
      // bez typu = výplňové větve a chomáče bez popisku.
      // zare = velikost záře kolem uzlu (1 = běžná), uzly: false = větve bez teček.
      skupiny: {
        ruzova:    { vaha: 25, barvy: ["#F28AA0", "#F4B8CB"], typ: "reklama",     zare: 1 },
        tyrkysova: { vaha: 20, barvy: ["#22C7B0", "#1E8FA8"], typ: "zajimave",    zare: 1.1 },
        fialova:   { vaha: 15, barvy: ["#A98BE6", "#7B4FD6"], typ: "lide",        zare: 1 },
        magenta:   { vaha: 10, barvy: ["#C21FB4"],            typ: "doporucene",  zare: 1.1 },
        bila:      { vaha: 10, barvy: ["#ECE8F0"],                                zare: 1.7, mlecna: true },
        limetkova: { vaha: 8,  barvy: ["#C9E24B"],            typ: "virali",      zare: 1 },
        modra:     { vaha: 5,  barvy: ["#2E3FD1"],                                uzly: false },
        cervena:   { vaha: 4,  barvy: ["#F2271C"],            typ: "extremismus", zare: 2 },
        olivova:   { vaha: 3,  barvy: ["#6E9A3A", "#8A5A2B"],                     uzly: false },
      },
      zareSila: 1,             // celková síla záře uzlů (0 = žádná, 1 = běžná, 2 = silná)
      chomace: ["bila", "ruzova", "tyrkysova"], // skupiny, které mají chomáče častěji

      stred: "#22C7B0",        // barva středu při zklidnění
      rudy: "#F2271C",         // rudý signál v příběhu
      text: "#FFFFFF",         // věta dole
      zvyrazneni: "#F2271C",   // *zvýrazněné slovo* ve větě dole
    },

    // Typy obsahu: velikost = poloměr tečky (kolik pozornosti to bere),
    // popisky = co se ukáže po najetí / klepnutí na tečku.
    // Názvy typů neměň – podle nich funguje paleta a příběh.
    typy: {
      extremismus: { velikost: 3.4,
        popisky: ["rage bait", "polarizing post", "political outrage", "misleading headline", "comment war"] },
      virali:      { velikost: 2.0,
        popisky: ["reels", "viral video", "trending", "meme", "live video", "celebrity gossip"] },
      reklama:     { velikost: 1.9,
        popisky: ["ad", "sponsored", "shop now", "crypto ad", "fake discount", "giveaway", "influencer post"] },
      doporucene:  { velikost: 1.7,
        popisky: ["suggested for you", "suggested page", "quiz", "horoscope", "game invite", "memories"] },
      lide:        { velikost: 1.5,
        popisky: ["people you may know", "friend suggestion", "follow suggestion"] },
      zajimave:    { velikost: 1.4,
        popisky: ["yoga event in Brno", "photo from a friend", "interesting article", "festival", "lecture", "design meetup"] },
    },

    // Příběh (každých ~12 s): zelená věc doputuje do středu, pak ji přebije červená.
    // Popisky se v každém kole střídají po řadě.
    pribeh: {
      zelene: ["yoga event in Brno", "photo from a friend", "interesting article", "festival", "lecture", "design meetup"],
      cervene: ["extremist political content", "rage bait", "misleading headline", "polarizing post", "comment war"],
    },

    // věta, která se po 6 s objeví dole – prázdné = žádná věta.
    // Slovo v *hvězdičkách* se zvýrazní barvou paleta.zvyrazneni.
    vetaDole: "",
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
    konec: "To je vše. Můžeš jít ven.", // věta na úplném konci feedu – prázdné = žádný konec
    souradnice: "49°11′N 16°36′E",   // souřadnice (Brno) v hlavičce a na konci
    nahoru: "zpět na úvod",          // popisek šipky nahoru na konci
    tapBarva: "klepni = barva",      // nápověda na liště screenshotu
  },
};
