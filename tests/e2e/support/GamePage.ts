import { expect, type Page } from '@playwright/test';
import type { DebugSnapshot } from '../../../src/debug';

/** Debug query parameters the game understands. `true` means a bare flag such as `god`. */
export interface RunOptions {
  seed?: number;
  /** Start this many seconds into the run. */
  t?: number;
  /** Starting items, e.g. { vulcan: 3, redEco: 2 }. */
  items?: Record<string, number>;
  map?: 'jak1' | 'jak2' | 'jak3';
  god?: boolean;
  /** Both eco meters at this value. */
  eco?: number;
  endless?: boolean;
  unlockAll?: boolean;
  /** Canvas pixels per game pixel. 1 unless a test asks for more. */
  res?: number;
}

const LEVEL_UP_GRACE_MS = 450;

/**
 * Page object for the game. Everything is drawn on one canvas, so instead of DOM locators it drives the game
 * through the keyboard (and canvas coordinates for menus) and reads state from the debug hooks:
 * `window.__precursor.snapshot()` during a run and `window.__precursorScenes()` for the active screens.
 *
 * Waits are expressed in game time, not wall-clock time, so a slow machine makes tests slower, never flaky.
 */
export class GamePage {
  constructor(readonly page: Page) {}

  async open(options: RunOptions = {}): Promise<void> {
    const params = new URLSearchParams({ debug: '' });
    if (options.seed !== undefined) params.set('seed', String(options.seed));
    if (options.t !== undefined) params.set('t', String(options.t));
    if (options.map) params.set('map', options.map);
    if (options.eco !== undefined) params.set('eco', String(options.eco));
    // Pinned: the browser reports a 1920x1080 screen here, which would otherwise pick 2x and make every
    // run (and the @perf measure) depend on the machine's screen instead of the test
    params.set('res', String(options.res ?? 1));
    if (options.items) params.set('items', Object.entries(options.items).map(([id, level]) => `${id}:${level}`).join(','));
    for (const flag of ['god', 'endless', 'unlockAll'] as const) if (options[flag]) params.set(flag, '');
    await this.page.goto(`./?${params.toString().replace(/=(&|$)/g, '$1')}`);
    await this.waitForScene('Title');
  }

  /** Seeds the browser save before the page loads, e.g. to start with batteries. */
  async withSave(save: Record<string, unknown>): Promise<void> {
    await this.page.addInitScript((data) => {
      localStorage.setItem('precursor-survivors:save', JSON.stringify(data));
    }, save);
  }

  async readSave(): Promise<Record<string, any>> {
    return JSON.parse((await this.page.evaluate(() => localStorage.getItem('precursor-survivors:save'))) ?? '{}');
  }

  /** Volumes and theme from the Options screen, stored apart from the save. */
  async readSettings(): Promise<Record<string, any>> {
    return JSON.parse((await this.page.evaluate(() => localStorage.getItem('precursor-survivors:settings'))) ?? '{}');
  }

  /** Title -> run setup -> run, with the keyboard. */
  async startRun(options: RunOptions = {}): Promise<void> {
    await this.open(options);
    await this.page.keyboard.press('Space');
    await this.waitForScene('Setup');
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => window.__precursor !== undefined);
  }

  async scenes(): Promise<string[]> {
    return this.page.evaluate(() => window.__precursorScenes?.() ?? []);
  }

  async waitForScene(key: string): Promise<void> {
    await expect.poll(() => this.scenes(), { message: `scene ${key} to be active` }).toContain(key);
  }

  async snapshot(): Promise<DebugSnapshot> {
    return this.page.evaluate(() => window.__precursor!.snapshot());
  }

  /**
   * Polls the run until `check` passes. Level-up cards are picked on the way (key 1) unless
   * `pickLevelUps` is false, so long waits don't stall on an open card screen.
   */
  async waitUntil(
    check: (s: DebugSnapshot) => boolean,
    { timeout = 60_000, pickLevelUps = true, message = 'game state' } = {},
  ): Promise<DebugSnapshot> {
    const deadline = Date.now() + timeout;
    for (;;) {
      const s = await this.snapshot();
      if (check(s)) return s;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${message}. Last state: ${JSON.stringify(summary(s))}`);
      if (pickLevelUps && s.state === 'levelUp') await this.pickUpgrade(1);
      else await this.page.waitForTimeout(100);
    }
  }

  /** Lets the run go on for `seconds` of game time. */
  async play(seconds: number, options: { pickLevelUps?: boolean } = {}): Promise<DebugSnapshot> {
    const start = (await this.snapshot()).elapsed;
    return this.waitUntil((s) => s.elapsed >= start + seconds, {
      timeout: seconds * 4000 + 30_000, message: `${seconds}s of game time`, ...options,
    });
  }

  /** Picks a card on the level-up screen, after the grace period in which it ignores keys. */
  async pickUpgrade(card: 1 | 2 | 3): Promise<void> {
    await this.page.waitForTimeout(LEVEL_UP_GRACE_MS);
    await this.page.keyboard.press(String(card));
    await this.page.waitForTimeout(100);
  }

  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Opens the pause with `key`. A level-up card screen can pop up at any moment (and ignores the pause key),
   * so if one shows up instead, its card is picked and the pause tried again.
   */
  async openPause(key = 'Escape'): Promise<DebugSnapshot> {
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.waitUntil((s) => s.state === 'playing', { message: 'the run to be playing' });
      await this.press(key);
      const s = await this.waitUntil((run) => run.state !== 'playing', {
        pickLevelUps: false, timeout: 3000, message: 'the pause to open',
      });
      if (s.state === 'paused') return s;
      await this.pickUpgrade(1);
    }
    throw new Error('The pause never opened: a level-up kept getting in the way');
  }
}

/** The interesting parts of a snapshot for error messages. */
function summary(s: DebugSnapshot) {
  const { elapsed, state, hp, level, kills, zone, bossesDefeated, victory, eco } = s;
  return { elapsed: Math.round(elapsed), state, hp: Math.round(hp), level, kills, zone, bossesDefeated, victory, eco };
}
