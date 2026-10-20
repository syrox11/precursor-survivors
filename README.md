# Precursor Survivors

[![CI](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml/badge.svg)](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml)

A browser game in the style of *Vampire Survivors*, set in the world of *Jak and Daxter*. Survive the Lurker horde on Sentinel Beach for 10 minutes to earn a Power Cell.

**▶ Play it: [syrox11.github.io/precursor-survivors](https://syrox11.github.io/precursor-survivors/)**

> Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog. *Jak and Daxter* and all related names are trademarks of their respective owners. All art in this repository is original placeholder art; no assets were taken from the games. Non-commercial.

## How to play

- **Move:** WASD or arrow keys. Attacks are automatic.
- Defeated Lurkers drop **Precursor orbs**. Collect them to level up.
- On every level up, pick one of three upgrades. You can carry **4 weapons and 4 passives**, each up to level 5.

**Weapons**

| Weapon | From | What it does |
|--------|------|--------------|
| Spin Kick | Jak and Daxter | Jak's starting attack: hits everything around him |
| Yellow Eco | Jak and Daxter | Eco blasts at the closest Lurkers |
| Scatter Gun | Jak II | Short-range shotgun cone where you face |
| Blaster | Jak II | Rapid shots at the closest Lurker, pierces from level 4 |
| Vulcan Fury | Jak II | Bullet bursts where you face |
| Peacemaker | Jak II | Slow orb that explodes in a big area |
| Arc Wielder | Jak 3 | Lightning that chains between Lurkers |

**Passives**

| Passive | Effect |
|---------|--------|
| Red Eco | +15% damage |
| Blue Eco | Faster movement, orbs are attracted from further away |
| Green Eco | More max health and regeneration |
| Precursor Armor | Less damage taken |
| Eco Amplifier | Bigger attack area |
| Keira's Tune-up | Shorter weapon cooldowns |

Enemies get tougher and more numerous over time: Lurker Puppies from the start, Babaks from 1:30 and Lurker Crabs from 3:30. From minute 2, a horde surrounds you every minute.

### Between runs

Every run pays out **Precursor batteries** (time survived, Lurkers defeated, a bonus for the Power Cell). Spend them in the **shop**, then set up your next run:

- **Starting weapon:** start with any weapon you have unlocked instead of the Spin Kick.
- **Companion:** each one rides with Jak and actually helps.

  | Companion | Effect |
  |-----------|--------|
  | Daxter | +10% speed, attracts orbs from further away |
  | Daxter (with pants) | Sprays bug spray at nearby Lurkers |
  | Pecker | +15% XP and warns you before each horde |
  | Clank | Shield that blocks all damage for 1.5s, recharges every 12s |

- **Bans:** pick items that will never be offered on level up, to steer your build. Ban slots are bought in the shop.
- **Skin:** Jak, Jak II, Jak 3, plus Dark Jak and Light Jak, which are earned through challenges.
- **Power-ups:** permanent upgrades to health, damage, speed, pickup range, XP and armor, plus rerolls for level-up offers.

Progress is saved in the browser (`localStorage`), with a versioned format that is validated on load.

## Roadmap

- [x] **Phase 1:** core loop (movement, Lurkers, orbs, levels, eco upgrades, one map)
- [x] **Phase 2:** weapons from the Morph Gun (*Jak II* and *Jak 3*), weapon and passive slots, harder difficulty curve with hordes
- [x] **Phase 3:** meta progression: Precursor batteries, shop, permanent power-ups, starting weapon, companions, bans, skins and challenges
- [ ] **Phase 4:** more maps and bosses, Daxter commentary
- [ ] **Phase 5:** E2E tests with Playwright on the canvas, performance checks

## Tech

- [Phaser 4](https://phaser.io/) + TypeScript, bundled with Vite
- Game rules (XP curve, items, stats, waves, save data, shop prices, rewards) live in `src/logic/` as plain functions with no Phaser dependency, so they are unit-tested with Vitest
- Seeded random generator: add `?seed=123` to the URL to get a reproducible run (same spawns, same upgrade offers)
- Debug mode for testing: `?debug` exposes a read-only snapshot of the run on `window.__precursor`, and `?debug&items=arc:3,scatter:2` starts the run with those items
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
├── debug.ts           # ?debug test hooks
├── combat/            # Weapon and companion behaviours, and the combat interface they use
├── logic/             # Pure game rules, save format and shop (unit-tested)
├── ui/                # Shared UI pieces (buttons)
└── scenes/            # Boot (placeholder art), Title, Setup, Shop, Game, LevelUp, GameOver
tests/unit/            # Vitest specs for src/logic
```

## License

Code under the [MIT License](LICENSE). This license covers the source code only, not the *Jak and Daxter* names or characters.
