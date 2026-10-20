import { expect, test } from './support/fixtures';

test.describe('pause', () => {
  test('ESC and P both pause and resume', async ({ game }) => {
    await game.startRun({ god: true });
    await game.play(1);

    for (const key of ['Escape', 'p']) {
      const paused = await game.openPause(key);
      await game.waitForScene('Pause');
      await game.page.waitForTimeout(500);
      expect((await game.snapshot()).elapsed, 'time stands still while paused').toBe(paused.elapsed);

      await game.press(key);
      await game.waitUntil((s) => s.state === 'playing', { pickLevelUps: false, message: 'the run to resume' });
    }
  });

  // Regressions: a press and release inside one frame used to be missed by "just pressed" polling,
  // and a second press right after opening the pause used to be swallowed by a fixed delay
  test('instant taps open and close the pause every time, even straight after opening', async ({ game }) => {
    await game.startRun({ god: true });

    for (let i = 0; i < 5; i++) {
      await game.play(0.5);
      await game.openPause();
      await game.press('Escape');
      await game.waitUntil((s) => s.state === 'playing', { pickLevelUps: false, timeout: 3000, message: `resume #${i + 1}` });
    }
  });

  // Guards against keys released while paused being missed by the game, which would leave Jak walking on
  // resume. Removing the key reset on resume does not make this fail with the current Phaser, so it is a
  // guard on the behaviour rather than a proven regression test.
  test('a movement key released during the pause does not stay held', async ({ game, page }) => {
    await game.startRun({ god: true });
    await game.play(1);

    await page.keyboard.down('d');
    await game.play(0.5);
    await game.openPause();
    await page.keyboard.up('d');
    await game.press('Escape');

    const resumed = await game.waitUntil((s) => s.state === 'playing', { pickLevelUps: false });
    const later = await game.play(1, { pickLevelUps: false });
    expect(Math.abs(later.player.x - resumed.player.x), 'Jak should stand still').toBeLessThan(2);
  });
});
