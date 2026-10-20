# Precursor Survivors

[![CI](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml/badge.svg)](https://github.com/syrox11/precursor-survivors/actions/workflows/ci.yml)

A browser game in the style of *Vampire Survivors*, set in the world of *Jak and Daxter*. Fight through the zones of Jak's world for 10 minutes, beat their bosses and earn a Power Cell.

**▶ Play it: [syrox11.github.io/precursor-survivors](https://syrox11.github.io/precursor-survivors/)**

> Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog. *Jak and Daxter* and all related names are trademarks of their respective owners. All art in this repository is original placeholder art; no assets were taken from the games. Non-commercial.

## How to play

- **Move:** WASD or arrow keys. Attacks are automatic.
- **Light Jak / Dark Jak:** `E` / `Q` when that eco meter is full, then `1`-`4` for its powers.
- **Pause:** `ESC` or `P`. The pause screen shows your build and stats; hover any weapon or passive for its exact numbers.
- Defeated Lurkers drop **Precursor orbs**. Collect them to level up.
- On every level up, pick one of three upgrades. You can carry **5 weapons and 4 passives**, and there is **no level cap**: damage keeps growing, while cooldowns, speed and counts approach sensible limits so the game stays playable. Cards show exactly what changes, e.g. *Damage 13 → 16, Every 0.46s → 0.42s*.

**Weapons**

The Morph Gun weapons come in four colours, as in *Jak 3*. The ones marked 🔒 have to be unlocked in the shop before they can show up in a run.

| Weapon | Colour | What it does |
|--------|--------|--------------|
| Spin Kick | – | Jak's starting attack: hits everything around him |
| Yellow Eco | – | Eco blasts at the closest Lurkers |
| Scatter Gun | 🔴 Red | Short-range shotgun cone where you face |
| Wave Concussor 🔒 | 🔴 Red | A shockwave that sweeps across the screen: pushes back and stuns (crowd control) |
| Plasmite RPG 🔒 | 🔴 Red | Rockets at the thickest crowd that leave burning plasma (area denial) |
| Blaster | 🟡 Yellow | Rapid shots at the closest Lurker, pierces from level 4 |
| Beam Reflexor 🔒 | 🟡 Yellow | Weak shots that bounce from Lurker to Lurker, one more bounce per level |
| Gyro Burster 🔒 | 🟡 Yellow | A spinning decoy that sprays shots and pulls nearby Lurkers in |
| Vulcan Fury | 🔵 Blue | Bullet bursts where you face |
| Arc Wielder | 🔵 Blue | Lightning that chains between Lurkers |
| Needle Lazer 🔒 | 🔵 Blue | Swarms of homing needles |
| Peacemaker | ⚫ Dark | Slow orb that explodes in a big area |
| Mass Inverter 🔒 | ⚫ Dark | Lifts Lurkers off the ground, then slams them for a share of their health |
| Super Nova 🔒 | ⚫ Dark | Slow-charging nova that blasts everything around Jak |

**Colour synergy:** carry two weapons of the same colour for a bonus to that colour, three for a bigger one. Red: more damage. Yellow: shorter cooldowns. Blue: extra projectiles (more needles, longer bursts, more chain jumps). Dark: bigger area.

**Weapon mods** come out of chests: an upgrade for one of your colours (e.g. *Red weapons: +15% damage*) or for one weapon (e.g. *Blaster: -10% cooldown*). They last for the run and stack.

**Passives**

| Passive | Effect |
|---------|--------|
| Red Eco | +15% damage |
| Blue Eco | Faster movement, orbs are attracted from further away |
| Green Eco | More max health and regeneration |
| Precursor Armor | Less damage taken |
| Eco Amplifier | Bigger attack area |
| Keira's Tune-up | Shorter weapon cooldowns |

Enemies get tougher and more numerous over time, and from minute 2 a horde surrounds you every minute.

### Maps

Each map follows one game. Every 2:30 the zone changes (ground, scenery and enemies), and 30 seconds before each change the zone's boss shows up. A boss you don't kill follows you into the next zone. To win, survive the 10 minutes **and** defeat the final boss. That earns the Power Cell, and then the run goes on in **endless mode** until Jak falls: a boss returns every 30 seconds, a bigger horde every 20, enemies gain +100% health and +50% damage per minute on top of the normal scaling, and spawns keep speeding up. Oracles (every 45s) and characters (every 60s) keep showing up too.

**The Precursor Legacy (Jak 1)**

| Time | Zone | Enemies | Boss (at) |
|------|------|---------|-----------|
| 0:00 | Green Sage's Village | Lurker Puppies, Lurker Crabs | Dark Eco Plant (2:00): spits dark eco |
| 2:30 | Blue Sage's Village | Babaks, Flying Lurkers (zigzag) | Klaww (4:30): throws boulders where you stand |
| 5:00 | Volcanic Crater | Bone Armor Lurkers (charge), Lava Spiders | Giant Lava Spider (7:00): lunges and hatches spiders |
| 7:30 | Gol and Maia's Citadel | All of the above | Gol and Maia's Precursor Robot (9:30): rings of dark eco, calls reinforcements |

**Renegade (Jak II)**, unlocked by winning The Precursor Legacy

| Time | Zone | Enemies | Boss (at) |
|------|------|---------|-----------|
| 0:00 | Haven City | Krimzon Guards, Krimzon Gunners (keep their distance and shoot) | Errol (2:00): circles you on his hover bike and rams through, calls in guards |
| 2:30 | The Sewers | Metal Head Flitters (zigzag), Metal Head Grunts | Krew (4:30): bullet fans from his hover chair, hired goons |
| 5:00 | Mar's Tomb | Metal Head Brutes (charge), Flitters, Gunners | Baron Praxis (7:00): aimed bursts and bombing runs on your position |
| 7:30 | Metal Head Nest | All the Metal Heads | Metal Kor (9:30): spiralling volleys, lunges, a brood of Metal Heads |

**Wastelander (Jak 3)**, unlocked by winning Renegade

| Time | Zone | Enemies | Boss (at) |
|------|------|---------|-----------|
| 0:00 | Spargus City | Marauders, a few Metal Heads | Metal Head Dinosaur (2:00): charges and stomps rings of shockwaves |
| 2:30 | The Wasteland | Marauders, Marauder Gunners, Metal Head Brutes | Marauder Chief (4:30): circles in his buggy throwing grenades, calls his gang |
| 5:00 | Precursor Temple | Precursor Drones (zigzag), Temple Guardians (charge) | Count Veger (7:00): blinks around you and fires a ring each time, summons drones |
| 7:30 | Haven City Ruins | KG Death Bots and Gunner Bots | Dark Maker Machine (9:30): laser sweeps, Death Bot drops, charges when damaged |

### Out in the field

- **Precursor chests** show up every so often (and when a boss falls). Walk over one to open it: a big **health** boost, a large **blue eco** orb that pulls in every Precursor orb on the map, or a **JET-Board** for a burst of speed.
- **Precursor oracles**, one per zone: touch one for a free level.
- **Characters from the saga**, one per zone, picked from that game's cast. An arrow on the screen edge points the way; reach them before they leave and they help out.

| Map | Characters |
|-----|-----------|
| Jak 1 | Samos, the Blue, Red and Yellow Sages, Keira, the Mayor, the Gambler, the Miners |
| Jak II | Torn, Keira, Sig, Ashelin, Brutter, Tess, Samos, Vin |
| Jak 3 | Kleiver, Damas, Torn, Ashelin, Keira, Samos, Tess, the Precursors |

Their gifts fit the character: Keira upgrades a weapon, Samos heals you and raises your max health, Torn, Sig, Ashelin and Damas fight next to you for 30 seconds, Vin raises an eco shield, the Yellow Sage wipes the screen with yellow eco, the Gambler hands out a random gift...

Enemies sometimes drop these pickups too (everything except weapon mods). Chests can also hold **light** or **dark eco** (fills that meter), **red eco** (more damage for a while), **yellow eco**, which turns into a turret that keeps shooting for 15 seconds, or a **weapon mod**.

Every hit shows its damage, and wounded enemies show a health bar.

### Light Jak and Dark Jak

Two separate meters fill as you pick up light and dark eco wisps, dropped by some enemies (bosses always drop several). With a meter full, press **E** for Light Jak or **Q** for Dark Jak. The form lasts while its meter drains; each power spends part of it.

| Key | Light Jak (takes half damage) | Dark Jak (+30% damage) |
|-----|------------------------------|------------------------|
| 1 | Heal: restore half your health | **Dark Bomb**: a huge blast around you, spends all the dark eco and ends the form |
| 2 | Flash Freeze: every enemy stops for 4s | Dark Blast: dark lightning jumps between enemies for 6s |
| 3 | Light Shield: no damage for 5s | Invisibility: enemies lose you for 6s |
| 4 | Light Flight: +80% speed for 6s | Dark Strike: charge and fire a wave straight ahead (three per full meter) |

### Between runs

Every run pays out **Precursor batteries** (time survived, Lurkers defeated, bosses beaten, a bonus for the Power Cell). Spend them in the **shop**, then set up your next run:

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
- [x] **Phase 4a:** zones and bosses; the Jak 1 map
- [x] **Phase 4b:** the Jak II map, unlocked by winning the first one
- [x] **Phase 4c:** the Jak 3 map, unlocked by winning the second one
- [x] **Phase 5a:** chests, oracles, saga characters, damage numbers and health bars
- [x] **Phase 5b:** Light Jak and Dark Jak: eco meters and activated powers; red and yellow eco
- [x] **Phase 5c:** the rest of the Jak 3 Morph Gun (7 weapons, unlocked in the shop), colour synergies, weapon mods from chests, 5 weapon slots
- [x] **Phase 5d:** pause screen with item details, numbers-first descriptions, no level cap, endless mode after the final boss, enemy pickup drops
- [ ] **Phase 6:** E2E tests with Playwright on the canvas, performance checks

## Tech

- [Phaser 4](https://phaser.io/) + TypeScript, bundled with Vite
- Game rules (XP curve, items, stats, waves, save data, shop prices, rewards) live in `src/logic/` as plain functions with no Phaser dependency, so they are unit-tested with Vitest
- Seeded random generator: add `?seed=123` to the URL to get a reproducible run (same spawns, same upgrade offers)
- Debug mode for testing: `?debug` exposes a read-only snapshot of the run on `window.__precursor`, `?debug&items=arc:3,scatter:2` starts the run with those items, `?debug&t=270` starts 270 seconds in (to jump to a zone or boss), `?debug&god` makes Jak take no damage, `?debug&map=jak2` plays a map even if it is locked, , `?debug&eco=100` starts with both eco meters full, `?debug&unlockAll` unlocks everything in your save, and `?debug&endless` starts straight in endless mode
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
