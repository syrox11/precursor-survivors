import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/logic/save';
import {
  defaultSettings, effectiveVolume, loadSettings, parseSettings, resolveTheme, SETTINGS_KEY, stepVolume, writeSettings,
} from '../../src/logic/settings';

const memoryStore = (): KeyValueStore => {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
};

describe('settings', () => {
  it('starts from the defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
  });

  it('round-trips through storage', () => {
    const store = memoryStore();
    const settings = { master: 0.5, music: 0.3, sfx: 1, muted: true, theme: 'jak2' as const };
    writeSettings(store, settings);
    expect(loadSettings(store)).toEqual(settings);
  });

  it('ignores corrupt or invalid values field by field', () => {
    expect(parseSettings('not json')).toEqual(defaultSettings());
    const parsed = parseSettings(JSON.stringify({ master: 7, music: -1, sfx: 'loud', muted: 'yes', theme: 'jak4' }));
    expect(parsed).toEqual({ ...defaultSettings(), master: 1, music: 0 });
  });

  it('survives a storage that throws', () => {
    const blocked: KeyValueStore = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadSettings(blocked)).toEqual(defaultSettings());
    expect(() => writeSettings(blocked, defaultSettings())).not.toThrow();
    expect(SETTINGS_KEY).toContain('settings');
  });

  it('steps volumes in tenths without leaving 0-1 or drifting', () => {
    let settings = { ...defaultSettings(), music: 0.6 };
    for (let i = 0; i < 3; i++) settings = stepVolume(settings, 'music', -1);
    expect(settings.music).toBe(0.3);
    for (let i = 0; i < 20; i++) settings = stepVolume(settings, 'music', 1);
    expect(settings.music).toBe(1);
    for (let i = 0; i < 20; i++) settings = stepVolume(settings, 'music', -1);
    expect(settings.music).toBe(0);
  });

  it('plays a channel at its volume times the master, and at 0 when muted', () => {
    const settings = { ...defaultSettings(), master: 0.5, music: 0.8 };
    expect(effectiveVolume(settings, 'music')).toBeCloseTo(0.4);
    expect(effectiveVolume({ ...settings, muted: true }, 'music')).toBe(0);
  });

  it('follows the run map on auto and otherwise keeps the chosen game', () => {
    expect(resolveTheme('auto', 'jak3')).toBe('jak3');
    expect(resolveTheme('jak2', 'jak3')).toBe('jak2');
  });
});
