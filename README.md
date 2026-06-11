# Diamant Haarlem

Een 3D arcade-game in Minecraft-stijl die zich afspeelt in **Haarlem**. Loop met
je **eigen popje** door de stad — langs de Grote Kerk, Molen De Adriaan, de
Amsterdamse Poort, het Spaarne en de **Veronicaschool** — pak alle diamanten,
ontwijk de creepers en haal een **highscore**. Gemaakt met
[Three.js](https://threejs.org) + Vite.

Voor de telefoon (grote knoppen), werkt ook op de laptop (pijltjes of WASD).
Houd een richting ingedrukt om te lopen.

## Wat zit erin

- **Arcade-intro** met topscore en knipperende "DRUK OP SPELEN".
- **Haarlem** als speelwereld met herkenningspunten + naambordjes.
- **Eigen popje** maken (huid, shirt, broek, haar, pet) — wordt onthouden.
- **Punten, levens en rondes**: elke ronde meer diamanten en creepers.
- **GAME OVER** met highscore-lijst (3 letters, arcade-stijl).

> De highscores staan nu nog **lokaal** (op het apparaat). De opzet is zo
> gebouwd dat ze met één stap naar een online/wereldwijde lijst (Supabase)
> omgezet kunnen worden — net als de geplande multiplayer ("samen spelen").

## Lokaal spelen / ontwikkelen

```bash
npm install
npm run dev      # open de link die hij toont
```

`npm run build` maakt de definitieve versie in `dist/`.

## Online zetten met Vercel

1. Push naar je `gamepep`-repo op GitHub.
2. [vercel.com](https://vercel.com) → **Add New… → Project** → kies de repo.
3. **Framework Preset: `Vite`** (Build `npm run build`, Output `dist`).
4. **Deploy**. Elke push zet automatisch een nieuwe versie online.

## Zelf aanpassen

Knoppen om aan te draaien staan bovenin [`src/main.js`](src/main.js):
`GRID`, `MAX_HEARTS`, `STEVE_SPEED`, `CREEPER_SPEED`, `BASE_DIAMONDS`,
`BASE_CREEPERS`, `START`.

| Bestand | Wat erin zit |
|---|---|
| [`src/haarlem.js`](src/haarlem.js) | de stad Haarlem: gebouwen, landmarks, Veronicaschool |
| [`src/character.js`](src/character.js) | het popje + kleur-opties |
| [`src/scores.js`](src/scores.js) | highscore-opslag (nu lokaal) |
| [`src/sfx.js`](src/sfx.js) | geluidjes |
| [`src/main.js`](src/main.js) | spel, schermen, scoring, camera, bediening |

## Bediening

- **Mobiel:** houd de knoppen onderin ingedrukt om te lopen.
- **Laptop:** pijltjestoetsen of `W` `A` `S` `D` ingedrukt houden.
