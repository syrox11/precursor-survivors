import { test as base, expect } from '@playwright/test';
import { GamePage } from './GamePage';

/**
 * `game` is a GamePage for the test's page. Every test also fails on uncaught errors in the page:
 * on a canvas game a crash often looks like a frozen frame, not a red error message.
 */
export const test = base.extend<{ game: GamePage }>({
  game: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await use(new GamePage(page));
    expect(errors, 'errors in the page').toEqual([]);
  },
});

export { expect };
