import { describe, expect, it } from 'vitest';
import { debugEco, debugEnabled, debugGodMode, debugLoadout, debugMap, debugStartTime } from '../../src/debug';

describe('debugEnabled', () => {
  it('is on only with the debug flag', () => {
    expect(debugEnabled('?debug')).toBe(true);
    expect(debugEnabled('?seed=1&debug')).toBe(true);
    expect(debugEnabled('?seed=1')).toBe(false);
  });
});

describe('debugLoadout', () => {
  it('is undefined without the items param', () => {
    expect(debugLoadout('?debug')).toBeUndefined();
  });

  it('parses items with levels, defaulting to level 1', () => {
    expect(debugLoadout('?items=arc:3,scatter,redEco:5')).toEqual({ arc: 3, scatter: 1, redEco: 5 });
  });

  it('skips unknown items and invalid levels', () => {
    expect(debugLoadout('?items=bfg:3,arc:9,blaster:0,vulcan:x,peacemaker:2')).toEqual({ arc: 9, peacemaker: 2 });
  });
});

describe('debugStartTime', () => {
  it('reads ?t= in seconds and ignores bad values', () => {
    expect(debugStartTime('?t=270')).toBe(270);
    expect(debugStartTime('?t=-5')).toBe(0);
    expect(debugStartTime('?t=abc')).toBe(0);
    expect(debugStartTime('?debug')).toBe(0);
  });
});

describe('debugGodMode', () => {
  it('needs both debug and god', () => {
    expect(debugGodMode('?debug&god')).toBe(true);
    expect(debugGodMode('?god')).toBe(false);
    expect(debugGodMode('?debug')).toBe(false);
  });
});

describe('debugMap', () => {
  it('accepts known maps only', () => {
    expect(debugMap('?map=jak2')).toBe('jak2');
    expect(debugMap('?map=jak9')).toBeUndefined();
    expect(debugMap('?debug')).toBeUndefined();
  });
});

describe('debugEco', () => {
  it('reads ?eco= and ignores bad values', () => {
    expect(debugEco('?eco=100')).toBe(100);
    expect(debugEco('?eco=-1')).toBe(0);
    expect(debugEco('?debug')).toBe(0);
  });
});
