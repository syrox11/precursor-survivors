import { describe, expect, it } from 'vitest';
import { formatTime } from '../../src/logic/records';

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [59.9, '00:59'],
    [61, '01:01'],
    [600, '10:00'],
    [-3, '00:00'],
  ])('%s -> %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
