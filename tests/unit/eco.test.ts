import { describe, expect, it } from 'vitest';
import {
  ABILITIES, addEco, canTransform, drain, EMPTY_ECO, FORM_SECONDS, METER_MAX, rollWisp, transform, useAbility,
  WISP_CHANCE, type EcoState,
} from '../../src/logic/eco';
import { createRng } from '../../src/logic/rng';

const full = (mode: 'light' | 'dark', other = 0): EcoState =>
  mode === 'light' ? { light: METER_MAX, dark: other, active: null } : { light: other, dark: METER_MAX, active: null };

describe('meters', () => {
  it('fill independently and cap at the max', () => {
    let state = addEco(EMPTY_ECO, 'light', 30);
    state = addEco(state, 'dark', 500);
    expect(state).toEqual({ light: 30, dark: METER_MAX, active: null });
  });
});

describe('transforming', () => {
  it('needs a full meter', () => {
    expect(canTransform(addEco(EMPTY_ECO, 'dark', 99), 'dark')).toBe(false);
    expect(transform(full('dark'), 'dark').active).toBe('dark');
  });

  it('allows only one form at a time', () => {
    const dark = transform({ light: METER_MAX, dark: METER_MAX, active: null }, 'dark');
    expect(transform(dark, 'light')).toEqual(dark);
  });

  it('lasts FORM_SECONDS on a full meter, then ends', () => {
    let state = transform(full('light'), 'light');
    state = drain(state, FORM_SECONDS / 2);
    expect(state.active).toBe('light');
    expect(state.light).toBeCloseTo(METER_MAX / 2);
    state = drain(state, FORM_SECONDS);
    expect(state).toEqual({ light: 0, dark: 0, active: null });
  });

  it('leaves the other meter alone', () => {
    const state = drain(transform(full('light', 40), 'light'), 5);
    expect(state.dark).toBe(40);
  });
});

describe('abilities', () => {
  it('cannot be used outside a form', () => {
    expect(useAbility(full('light'), 0).ability).toBeNull();
  });

  it('spends their cost from the active meter', () => {
    const { state, ability } = useAbility(transform(full('light'), 'light'), 0);
    expect(ability?.id).toBe('heal');
    expect(state.light).toBe(METER_MAX - ABILITIES.light[0].cost);
    expect(state.active).toBe('light');
  });

  it('refuses when the meter is too low', () => {
    const low: EcoState = { light: 10, dark: 0, active: 'light' };
    expect(useAbility(low, 1).ability).toBeNull();
  });

  it('lets Dark Strike fire three times on a full meter', () => {
    let state = transform(full('dark'), 'dark');
    let fired = 0;
    for (let i = 0; i < 4; i++) {
      const result = useAbility(state, 3);
      if (result.ability) fired++;
      state = result.state;
    }
    expect(fired).toBe(3);
  });

  it('ends Dark Jak with the Dark Bomb and empties the meter', () => {
    const { state, ability } = useAbility(transform(full('dark'), 'dark'), 0);
    expect(ability?.id).toBe('darkBomb');
    expect(state).toEqual({ light: 0, dark: 0, active: null });
  });

  it('maps keys 1-4 to four abilities per form', () => {
    expect(ABILITIES.light.map((a) => a.id)).toEqual(['heal', 'timeStop', 'shield', 'wings']);
    expect(ABILITIES.dark.map((a) => a.id)).toEqual(['darkBomb', 'darkBlast', 'invisibility', 'darkStrike']);
  });
});

describe('rollWisp', () => {
  it('drops wisps at about the configured rates', () => {
    const rng = createRng(2);
    const counts = { light: 0, dark: 0, none: 0 };
    for (let i = 0; i < 20000; i++) counts[rollWisp(rng) ?? 'none']++;
    expect(counts.dark / 20000).toBeCloseTo(WISP_CHANCE.dark, 2);
    expect(counts.light / 20000).toBeCloseTo(WISP_CHANCE.light, 2);
  });
});
