# where is my space?

Studijní prototyp k digitálnímu wellbeingu. Statická stránka (HTML + CSS + JS), žádná instalace.

+ **Otevření:** dvojklik na `index.html`.
+ **Texty a polohy klikacích oblastí:** `content.js`.
+ **Screenshoty do feedu:** složka `screenshots/`, názvy podle `content.js`.
+ **Ostrá koláž přes video:** ulož průhledné PNG jako `kolaz.png` vedle `index.html`. Musí mít stejný poměr stran jako video (ideálně 3718 × 2230 px).
+ **Doladění klikacích oblastí:** `index.html?edit` → táhni kolečka, nové souřadnice jsou v konzoli (F12) → zkopíruj do `content.js`.

| soubor | co dělá |
|---|---|
| `index.html` | kostra stránky |
| `style.css` | vzhled |
| `content.js` | všechny texty + polohy klikacích oblastí |
| `app.js` | úvodní scéna, přepínání scén, režim `?edit` |
| `chaos.js` | scéna chaos (neuronová síť) – technické ladění v bloku CONFIG nahoře |
| `feed.js` | scéna feed (karty, vrstevnice, kompas, horský graf) |
| `les.jpg` | fotka na pozadí feedu |
| `strom.mp4` | původní video (3718 × 2230, 5 s) – stránka ho nepoužívá, je to zdroj |
| `strom-crossfade.mp4` | **video na stránce**: smyčka s prolnutím, 1920 px, bez zvuku |
| `strom-loop.mp4` | alternativní smyčka ping-pong (dopředu + pozpátku) |
| `compare.html` | porovnání obou smyček vedle sebe |
| `kolaz.png` | *(volitelné)* průhledné PNG s ostrými prvky koláže, položí se přesně přes video |
| `strom-poster.jpg` | první obrázek, než se video načte + rozmazané pozadí na mobilu |
