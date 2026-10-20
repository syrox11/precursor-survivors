import { expect, test } from './support/fixtures';

const totalLevels = (loadout: Record<string, number | undefined>) =>
  Object.values(loadout).reduce<number>((sum, level) => sum + (level ?? 0), 0);

test.describe('core loop', () => {
  test('enemies come, fall to the starting weapon and drop orbs that level Jak up', async ({ game }) => {
    await game.startRun({ god: true, seed: 1 });

    // Level 2 and back in play, so the card has been picked
    const later = await game.waitUntil((s) => s.level >= 2 && s.state === 'playing', { timeout: 90_000, message: 'a level up' });
    expect(later.kills).toBeGreaterThan(0);
    expect(totalLevels(later.loadout)).toBeGreaterThan(1);
  });

  test('picking a card on level up adds or upgrades exactly one item', async ({ game }) => {
    await game.startRun({ god: true, seed: 2, items: { vulcan: 2 } });

    const before = await game.waitUntil((s) => s.state === 'levelUp', { pickLevelUps: false, timeout: 90_000, message: 'the level-up screen' });
    await game.pickUpgrade(1);
    const after = await game.waitUntil((s) => s.state === 'playing', { pickLevelUps: false });

    expect(totalLevels(after.loadout)).toBe(totalLevels(before.loadout) + 1);
  });

  test('Jak can die, which ends the run and pays out batteries', async ({ game }) => {
    // Late in the run with only the starting kick: the volcano crowd is deadly
    await game.startRun({ t: 450, seed: 3 });

    await game.waitUntil((s) => s.state === 'over', { timeout: 90_000, message: 'Jak to fall' });
    await game.waitForScene('GameOver');

    const save = await game.readSave();
    expect(save.runs).toBe(1);
    expect(save.batteries).toBeGreaterThan(0);
    expect(save.bestTime).toBeGreaterThanOrEqual(450);
  });

  test('zones change on schedule', async ({ game }) => {
    await game.startRun({ god: true, t: 147 });
    expect((await game.snapshot()).zone).toBe(0);

    const next = await game.waitUntil((s) => s.elapsed >= 151, { message: 'the zone boundary' });
    expect(next.zone).toBe(1);
  });
});
