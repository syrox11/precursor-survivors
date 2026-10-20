# Precursor Survivors

[![CI](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml/badge.svg)](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml)

A browser game in the style of *Vampire Survivors*, set in the world of *Jak and Daxter*. Survive the Lurker horde on Sentinel Beach for 10 minutes to earn a Power Cell.

**▶ Play it: [syrox11.github.io/precursor-survivors](https://syrox11.github.io/precursor-survivors/)**

> Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog. *Jak and Daxter* and all related names are trademarks of their respective owners. All art in this repository is original placeholder art; no assets were taken from the games. Non-commercial.

## How to play

- **Move:** WASD or arrow keys. Attacks are automatic.
- Defeated Lurkers drop **Precursor orbs**. Collect them to level up.
- On every level up, pick one of three upgrades:

| Upgrade | Effect |
|---------|--------|
| Spin Kick | Jak's starting attack: bigger area, faster and stronger |
| Red Eco | More damage on every attack |
| Blue Eco | Faster movement, orbs are attracted from further away |
| Green Eco | More max health and regeneration |
| Yellow Eco | Fires eco blasts at the closest Lurkers |

Enemies get tougher and more numerous over time: Lurker Puppies from the start, Babaks from 0:45 and Lurker Crabs from 2:30.

## Roadmap

- [x] **Phase 1:** core loop (movement, Lurkers, orbs, levels, eco upgrades, one map)
- [ ] **Phase 2:** weapons: the Morph Gun and its mods from *Jak II* and *Jak 3*
- [ ] **Phase 3:** meta progression: Precursor batteries, an unlock shop, playable characters (Dark Jak, Light Jak...) and skins
- [ ] **Phase 4:** more maps and bosses, Daxter commentary
- [ ] **Phase 5:** E2E tests with Playwright on the canvas, performance checks

## Tech

- [Phaser 4](https://phaser.io/) + TypeScript, bundled with Vite
- Game rules (XP curve, upgrades, stats, waves, records) live in `src/logic/` as plain functions with no Phaser dependency, so they are unit-tested with Vitest
- Seeded random generator: add `?seed=123` to the URL to get a reproducible run (same spawns, same upgrade offers)
- GitHub Actions: typecheck, unit tests and build on every push; deploys to GitHub Pages from `main`

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # typecheck + production build in dist/
```

## Project structure

```
src/
├── main.ts            # Phaser game config
├── config.ts          # Screen size, world size, colours
├── logic/             # Pure game rules (unit-tested)
└── scenes/            # Boot (placeholder art), Title, Game, LevelUp, GameOver
tests/unit/            # Vitest specs for src/logic
```

## License

Code under the [MIT License](LICENSE). This license covers the source code only, not the *Jak and Daxter* names or characters.
