import { expect, test } from './support/fixtures';

/** The rest of the suite runs at 1x (see GamePage): these force a sharper canvas. */
test.describe('render scale', () => {
  test('at 2x the canvas doubles but menus are still clicked at the same spots', async ({ game, page }) => {
    await game.open({ res: 2 });
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      return { width: c.width, height: c.height };
    });
    expect(canvas).toEqual({ width: 1920, height: 1080 });

    // Same coordinates as at 1x: the camera zoom keeps the 960x540 layout
    await page.mouse.click(480, 385);
    await game.waitForScene('Shop');
  });

  test('at 2x a run plays, follows Jak and pauses as usual', async ({ game }) => {
    await game.startRun({ res: 2, god: true });
    const start = await game.snapshot();
    await game.page.keyboard.down('d');
    const run = await game.play(2);
    await game.page.keyboard.up('d');
    expect(run.state).toBe('playing');
    expect(run.player.x).toBeGreaterThan(start.player.x + 100);
    expect((await game.openPause()).state).toBe('paused');
  });
});
