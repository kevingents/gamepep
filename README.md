# Diamant Doolhof

Een webgame in Minecraft-stijl voor mobiel. Loop met Steve door het doolhof,
pak alle diamanten en ontwijk de creepers. Gemaakt voor de telefoon (grote
knoppen + vegen), werkt ook op de laptop (pijltjes of WASD).

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

- **Levels / doolhof:** `src/levels.js`. Teken met deze tekens:
  - `#` muur · `.` pad · `S` startplek van Steve · `D` diamant · `C` creeper
  - Elke regel moet even lang zijn. Zet `D` en `C` altijd op een pad.
- **Snelheid creepers:** `creeperInterval` in `src/main.js` (lager = sneller).
- **Aantal hartjes:** `MAX_HEARTS` in `src/main.js`.
- **Kleuren / uiterlijk:** `src/style.css` en de teken-functies in `src/main.js`.
- **Geluidjes:** `src/sfx.js`.

## Bediening

- **Mobiel:** veeg over het scherm, of gebruik de knoppen onderin.
- **Laptop:** pijltjestoetsen of `W` `A` `S` `D`.
