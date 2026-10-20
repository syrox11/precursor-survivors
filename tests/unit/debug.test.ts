import { describe, expect, it } from 'vitest';
import { debugEnabled, debugLoadout } from '../../src/debug';

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
    expect(debugLoadout('?items=bfg:3,arc:9,blaster:0,vulcan:x,peacemaker:2')).toEqual({ peacemaker: 2 });
  });
});
