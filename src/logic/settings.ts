import { MAP_ORDER, type MapId } from './maps';
import type { KeyValueStore } from './save';

export const SETTINGS_KEY = 'precursor-survivors:settings';

/** Menu look: one of the three games, or "auto" to follow the map picked for the next run. */
export type ThemeChoice = 'auto' | MapId;
export const THEME_CHOICES: ThemeChoice[] = ['auto', ...MAP_ORDER];

export type VolumeChannel = 'master' | 'music' | 'sfx';

/** Player preferences, kept apart from the save so a reset of progress keeps them. Volumes go 0 to 1. */
export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  theme: ThemeChoice;
}

/** Volumes move in tenths, which is also how they are shown. */
export const VOLUME_STEP = 0.1;

export function defaultSettings(): Settings {
  return { master: 0.8, music: 0.6, sfx: 0.8, muted: false, theme: 'auto' };
}

const tenths = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;

const volume = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? tenths(value) : fallback;

/** Anything missing or invalid in storage falls back to the default. */
export function parseSettings(raw: string | null): Settings {
  const fallback = defaultSettings();
  let data: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed;
  } catch {
    // Corrupt settings: start from the defaults
  }
  return {
    master: volume(data.master, fallback.master),
    music: volume(data.music, fallback.music),
    sfx: volume(data.sfx, fallback.sfx),
    muted: typeof data.muted === 'boolean' ? data.muted : fallback.muted,
    theme: THEME_CHOICES.includes(data.theme as ThemeChoice) ? (data.theme as ThemeChoice) : fallback.theme,
  };
}

export function loadSettings(store: KeyValueStore | undefined): Settings {
  try {
    return parseSettings(store?.getItem(SETTINGS_KEY) ?? null);
  } catch {
    return defaultSettings();
  }
}

export function writeSettings(store: KeyValueStore | undefined, settings: Settings): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not persisted; the settings last until the tab closes
  }
}

/** One step up (+1) or down (-1), kept between 0 and 1. */
export function stepVolume(settings: Settings, channel: VolumeChannel, direction: 1 | -1): Settings {
  return { ...settings, [channel]: tenths(settings[channel] + direction * VOLUME_STEP) };
}

/** What a channel actually plays at: its own volume times the master, or silence when muted. */
export function effectiveVolume(settings: Settings, channel: 'music' | 'sfx'): number {
  return settings.muted ? 0 : settings.master * settings[channel];
}

/** The game whose look and menu sounds are used. */
export function resolveTheme(choice: ThemeChoice, map: MapId): MapId {
  return choice === 'auto' ? map : choice;
}
