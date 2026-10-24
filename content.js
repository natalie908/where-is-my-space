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
  + feed       – sekce, příspěvky (přepsané ze screenshotů), akce týdne, souřadnice.
                 Fotky k příspěvkům jsou ve složce images/.
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
    nadpis: "", // velký nadpis nahoře ve feedu – prázdné = bez nadpisu
    podnadpis: "", // prázdné = žádný popisek
    zpet: "← zpět",

    sekce: [
      {
        nazev: "Oblíbené",
        popis: "",
        // Příspěvky přepsané ze screenshotů (šablona FB příspěvku).
        // autor = jméno / stránka, profilovka = obrázek z images/profilovky/ ("" = iniciály),
        // kde = skupina nebo stránka, kde to vyšlo ("" = nic),
        // cas = kdy, text = příspěvek, foto = obrázek z images/ ("" = bez fotky, víc obrázků = ["a.png", "b.png"]),
        // reakce = řádek dole s počtem reakcí a komentářů ("" = nezobrazovat)
        prispevky: [
          { autor: "Jan Oplatek", profilovka: "images/profilovky/jan-oplatek.jpg", kde: "", cas: "13 min",
            text: "Cesta zpátky do Brna vedla přes Marsu Matruh. Obvykle létáme přes pobřeží u El Alameinu, což je trošku východněji.",
            foto: "images/pobrezi-z-letadla.jpg", reakce: "44 reakcí · 2 komentáře" },
          { autor: "Co.Labs", profilovka: "images/profilovky/colabs.jpg", kde: "vytvořil(a) událost", cas: "23 h",
            text: "Divadlo T-Art: On a Ona – čt 29. 10. v 19:30, CO.LABS, Kounicova 20, Brno. Na motivy díla O. Kobyljanské – „Tvůj jazyk není pro mé uši“.",
            foto: "images/colabs-on-a-ona.jpg", reakce: "" },
          { autor: "Brain We Are", profilovka: "images/profilovky/brain-we-are.jpg", kde: "", cas: "1 h",
            text: "Psycholog a matematik Radvan Bahbouh na 333. díle podcastu @brain_we_are…",
            foto: "images/brain-we-are-podcast.jpg", reakce: "" },
          { autor: "KISK", profilovka: "images/profilovky/kisk.jpg", kde: "vytvořil(a) událost", cas: "1 d",
            text: "Komunitní večeře – čt 29. 10. v 18:15, knihovna Na Křižovatce, Brno.",
            foto: "images/kisk-komunitni-vecere.jpg", reakce: "3 reakce" },
          { autor: "Co.Labs", profilovka: "images/profilovky/colabs.jpg", kde: "přidal(a) událost", cas: "23 h",
            text: "LIMINAL – pá 13. 11. v 19:30, Co.Labs.",
            foto: "images/colabs-liminal.jpg", reakce: "19 lidí to zajímá" },
          { autor: "Zen Neor", profilovka: "images/profilovky/zen-neor.jpg", kde: "", cas: "1 d",
            text: "And yet, we still met.",
            foto: "images/zen-neor-ilustrace.jpg", reakce: "" },
        ],
      },
      {
        nazev: "Akce týdne (agent)",
        popis: "Jednou týdně mi AI agent vybere akce v Brně podle mých témat (technologie, jóga, festivaly, design, přednášky). Preferuje akce zdarma.",
        // screenshoty z mé stránky Kam v Brně (agent). cela: true = obrázek se neořízne
        prispevky: [
          { autor: "Kam v Brně", profilovka: "", kde: "AI agent", cas: "24.–31. 10. 2026",
            text: "", foto: ["images/kam-v-brne-1.png", "images/kam-v-brne-2.png"], cela: true, reakce: "" },
        ],
      },
    ],

    prazdnaKarta: "sem přijde screenshot",
    zdarma: "zdarma",
    konec: "", // věta na úplném konci feedu – prázdné = žádná věta
    souradnice: "49°11′N 16°36′E",   // souřadnice (Brno) v hlavičce a na konci
    nahoru: "",          // popisek šipky nahoru na konci ("" = jen šipka)
  },
};
