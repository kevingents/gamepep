# Diamant Nederland

Een 3D arcade-game in Minecraft-stijl die zich afspeelt in **steden van
Nederland**: Haarlem, Uithoorn, Amsterdam, Rotterdam, Utrecht en Den Haag. Loop
in **first person** met je **eigen popje** door de straten, pak alle diamanten of
speel tikkertje/verstoppertje, en leer onderweg over de gebouwen. Gemaakt met
[Three.js](https://threejs.org) + Vite.

Voor de telefoon (grote knoppen), werkt ook op de laptop (pijltjes of WASD):
omhoog = vooruit, links/rechts = draaien, omlaag = achteruit.

## Wat zit erin

- **Drie spellen** om uit te kiezen:
  - **Diamanten zoeken** — pak alle diamanten, ontwijk de creepers (3 levens).
  - **Tikkertje** — tik alle rondrennende kinderen voor de tijd om is (geen monsters).
  - **Verstoppertje** — vind alle verstopte kinderen voor de tijd om is (geen monsters).
- **6 steden** om te kiezen, elk met eigen herkenningspunten + weetjes: straten,
  huizen, bomen, rijdende auto's, water en landmarks met naambordjes.
- **Eigen popje + naam**: stel je popje in (huid, kapsel, haarkleur, shirt, broek,
  schoenen, bril, pet) en kies een naam. Wordt onthouden.
- **Weetjes per stad**: loop je naar een gebouw, dan verschijnt een leuk feitje
  over die plek.
- **Arcade-intro**, punten, rondes en **GAME OVER** met highscore-lijst.

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
`GRID` (grootte stad), `MAX_HEARTS`, `STEVE_SPEED`, `CREEPER_SPEED`,
`BASE_DIAMONDS`, `BASE_CREEPERS`, `BASE_KIDS`, `TAG_TIME`, `HIDE_TIME`, `START`.

| Bestand | Wat erin zit |
|---|---|
| [`src/city.js`](src/city.js) | de steden: algemene bouwer + landmarks/weetjes per stad |
| [`src/character.js`](src/character.js) | het popje + kleur-opties |
| [`src/scores.js`](src/scores.js) | highscore-opslag (nu lokaal) |
| [`src/sfx.js`](src/sfx.js) | geluidjes |
| [`src/main.js`](src/main.js) | spel, schermen, scoring, camera, bediening |

## Bediening

- **Mobiel:** houd de knoppen onderin ingedrukt om te lopen.
- **Laptop:** pijltjestoetsen of `W` `A` `S` `D` ingedrukt houden.
