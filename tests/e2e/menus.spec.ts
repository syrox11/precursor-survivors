import { expect, test } from './support/fixtures';

/** Canvas coordinates of menu controls (the viewport matches the 960x540 game). */
const TITLE_SHOP = { x: 480, y: 385 };
const SHOP_TAB_COMPANIONS = { x: 661, y: 100 };
const SHOP_ROW_BUY = (row: number) => ({ x: 850, y: 140 + row * 40 + 18 });

test.describe('menus', () => {
  test('title leads to the run setup and then into a run', async ({ game }) => {
    await game.open();
    expect(await game.scenes()).toEqual(['Title']);

    await game.press('Space');
    await game.waitForScene('Setup');

    await game.press('Enter');
    await game.waitForScene('Game');
    const run = await game.play(2);
    expect(run.state).toBe('playing');
    expect(run.hp).toBe(run.maxHp);
  });

  test('buying a companion spends batteries and is saved', async ({ game, page }) => {
    await game.withSave({ batteries: 200 });
    await game.open();

    await page.mouse.click(TITLE_SHOP.x, TITLE_SHOP.y);
    await game.waitForScene('Shop');
    await page.mouse.click(SHOP_TAB_COMPANIONS.x, SHOP_TAB_COMPANIONS.y);
    // Row 1 is Daxter (with pants), 60 batteries
    const buy = SHOP_ROW_BUY(1);
    await page.mouse.click(buy.x, buy.y);

    await expect.poll(async () => (await game.readSave()).companions).toContain('daxterPants');
    expect((await game.readSave()).batteries).toBe(140);
  });

  test('the starting weapon chosen in the setup is what the run starts with', async ({ game }) => {
    await game.withSave({ weapons: ['spin', 'blaster'], setup: { weapon: 'blaster' } });
    await game.startRun({ god: true });

    expect((await game.snapshot()).loadout).toEqual({ blaster: 1 });
  });

  test('a save pointing at a locked map falls back to the first one', async ({ game }) => {
    await game.withSave({ setup: { map: 'jak3' } });
    await game.startRun({ god: true });

    const run = await game.snapshot();
    expect(run.zone).toBe(0);
    expect((await game.readSave()).setup.map).toBe('jak1');
  });
});
