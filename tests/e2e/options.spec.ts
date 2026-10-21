import { expect, test } from './support/fixtures';

/** Canvas coordinates of the Options controls (the viewport matches the 960x540 game). */
const TITLE_OPTIONS = { x: 700, y: 385 };
const MUSIC_DOWN = { x: 470, y: 178 };
const MUTE = { x: 480, y: 274 };
const THEME_JAK3 = { x: 750, y: 395 };
const BACK = { x: 110, y: 500 };
const PAUSE_OPTIONS = { x: 480, y: 500 };

test.describe('options', () => {
  test('volume, mute and theme changes are saved for the next visit', async ({ game, page }) => {
    await game.open();
    await page.mouse.click(TITLE_OPTIONS.x, TITLE_OPTIONS.y);
    await game.waitForScene('Options');

    await page.mouse.click(MUSIC_DOWN.x, MUSIC_DOWN.y);
    await expect.poll(async () => (await game.readSettings()).music).toBe(0.5);
    // Every change redraws the screen: wait for each one to be saved before the next click
    await page.mouse.click(MUSIC_DOWN.x, MUSIC_DOWN.y);
    await expect.poll(async () => (await game.readSettings()).music).toBe(0.4);
    await page.mouse.click(MUTE.x, MUTE.y);
    await expect.poll(async () => (await game.readSettings()).muted).toBe(true);
    await page.mouse.click(THEME_JAK3.x, THEME_JAK3.y);
    await expect.poll(async () => (await game.readSettings()).theme).toBe('jak3');

    await page.reload();
    await game.waitForScene('Title');
    expect(await game.readSettings()).toMatchObject({ music: 0.4, muted: true, theme: 'jak3' });

    await page.mouse.click(TITLE_OPTIONS.x, TITLE_OPTIONS.y);
    await game.waitForScene('Options');
    await page.mouse.click(BACK.x, BACK.y);
    await game.waitForScene('Title');
  });

  test('options open from the pause screen and go back to it, run still paused', async ({ game, page }) => {
    await game.startRun({ god: true });
    await game.openPause();

    await page.mouse.click(PAUSE_OPTIONS.x, PAUSE_OPTIONS.y);
    await game.waitForScene('Options');
    // Drawn over the paused run and the pause screen, not hidden under them
    expect(await page.evaluate(() => window.__precursorTopScene?.())).toBe('Options');
    const during = await game.snapshot();
    expect(during.state).toBe('paused');

    await game.press('Escape');
    await expect.poll(() => game.scenes()).toEqual(expect.arrayContaining(['Pause']));
    expect(await game.scenes()).not.toContain('Options');
    const after = await game.snapshot();
    expect(after.state).toBe('paused');
    expect(after.elapsed).toBe(during.elapsed);
  });
});
