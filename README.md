# Diamant Wereld

Een 3D web-game in Minecraft-stijl voor mobiel. Loop met Steve door een open
blokkenwereld, pak alle diamanten en ontwijk de creepers. De camera loopt
vanzelf mee. Gemaakt met [Three.js](https://threejs.org) + Vite.

Gemaakt voor de telefoon (grote knoppen), werkt ook op de laptop (pijltjes of
WASD). Houd een richting ingedrukt om te lopen.

## Lokaal spelen / ontwikkelen

```bash
npm install      # eenmalig de boel installeren
npm run dev      # start een lokale server, open de link die hij toont
```

`npm run build` maakt de definitieve versie in de map `dist/`.
`npm run preview` toont die definitieve versie lokaal.

## Online zetten met Vercel

1. Zet deze map op GitHub (push naar je `gamepep`-repo).
2. Ga naar [vercel.com](https://vercel.com) → **Add New… → Project** → kies de repo.
3. **Framework Preset: `Vite`** (Vercel herkent dit meestal vanzelf).
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Klik **Deploy**. Klaar — je krijgt een link die je op de telefoon kunt openen.

Elke keer dat je iets naar GitHub pusht, zet Vercel automatisch de nieuwe versie online.

## Zelf aanpassen

Alle knoppen om aan te draaien staan **bovenin [`src/main.js`](src/main.js)**:

| Instelling | Wat het doet |
|---|---|
| `GRID` | grootte van het speelveld |
| `MAX_HEARTS` | aantal levens |
| `STEVE_SPEED` | hoe snel Steve loopt |
| `CREEPER_SPEED` | hoe snel de creepers lopen (lager = makkelijker) |
| `BASE_DIAMONDS` | aantal diamanten in ronde 1 |
| `BASE_CREEPERS` | aantal creepers in ronde 1 |

Elke ronde komen er automatisch wat meer diamanten en creepers bij.

- **Uiterlijk** (kleuren, Steve, creeper, bomen): de teken-functies in
  [`src/main.js`](src/main.js) (`makeSteve`, `makeCreeper`, `makeTree`, de
  texturen bovenaan).
- **Geluidjes:** [`src/sfx.js`](src/sfx.js).

## Bediening

- **Mobiel:** houd de knoppen onderin ingedrukt om te lopen.
- **Laptop:** pijltjestoetsen of `W` `A` `S` `D` ingedrukt houden.
