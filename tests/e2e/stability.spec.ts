import { expect, test } from './support/fixtures';

/** A maxed late-game build: huge areas, near-zero cooldowns, everything dying far from Jak. */
const STRESS_BUILD = {
  superNova: 25, peacemaker: 20, massInverter: 20, gyroBurster: 15, needleLazer: 20,
  amplifier: 12, redEco: 20, tuneUp: 12,
};

test.describe('stability', () => {
  // Regression: with a cooldown below its 0.6s charge, Super Nova orphaned a glow on every shot
  test('Super Nova firing faster than it charges does not leak effects', async ({ game }) => {
    await game.startRun({ god: true, endless: true, items: { superNova: 40, tuneUp: 20, amplifier: 10 } });

    const early = await game.play(5);
    const late = await game.play(15);
    expect(late.circles, `circles went from ${early.circles} to ${late.circles}`).toBeLessThan(early.circles + 25);
  });

  // Regression: uncollected orbs piled up by the thousand and slowed the game to a crawl
  test('orbs on the ground stay capped however many enemies die', async ({ game }) => {
    // PERF_RES=2 measures the sharper canvas; the bar is set for the default 1x
    await game.startRun({ god: true, endless: true, map: 'jak3', items: STRESS_BUILD, res: Number(process.env.PERF_RES ?? 1) });

    const s = await game.play(30);
    expect(s.kills).toBeGreaterThan(300);
    expect(s.orbs.length).toBeLessThanOrEqual(200);
  });
});

test.describe('performance @perf', () => {
  test('the game keeps up with real time under a stress build', async ({ game }, testInfo) => {
    await game.startRun({ god: true, endless: true, map: 'jak3', items: STRESS_BUILD });
    await game.play(3);

    // Game seconds per real second while the build runs flat out. 1.0 means no slowdown.
    // Level-up screens are skipped from the measure: they stop game time on purpose.
    let gameSeconds = 0;
    let realSeconds = 0;
    for (let sample = 0; sample < 8; sample++) {
      const before = await game.snapshot();
      const startedAt = Date.now();
      await game.page.waitForTimeout(2500);
      const after = await game.snapshot();
      if (before.state !== 'playing' || after.state !== 'playing') {
        if (after.state === 'levelUp') await game.pickUpgrade(1);
        continue;
      }
      gameSeconds += after.elapsed - before.elapsed;
      realSeconds += (Date.now() - startedAt) / 1000;
    }

    const speed = gameSeconds / realSeconds;
    testInfo.annotations.push({ type: 'game speed', description: `${speed.toFixed(2)}x real time` });
    console.log(`game speed under stress: ${speed.toFixed(2)}x`);
    // CI runners render without a GPU, so they get a lower bar than a real machine
    expect(speed).toBeGreaterThan(Number(process.env.PERF_MIN_SPEED ?? (process.env.CI ? 0.5 : 0.85)));
  });
});
