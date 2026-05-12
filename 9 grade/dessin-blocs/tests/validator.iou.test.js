// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { iouScore } from '../_engine/validator.js';

describe('iouScore', () => {
  it('returns ~1.0 for identical paths', () => {
    const a = [{ x1: 100, y1: 100, x2: 200, y2: 100 }];
    const score = iouScore(a, a, { maskSize: 500, dilatePx: 4 });
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('returns ≤ 0.2 for fully disjoint paths far apart', () => {
    const a = [{ x1: 50, y1: 50, x2: 100, y2: 50 }];
    const b = [{ x1: 400, y1: 400, x2: 450, y2: 400 }];
    const score = iouScore(a, b, { maskSize: 500, dilatePx: 4 });
    expect(score).toBeLessThanOrEqual(0.2);
  });

  it('returns 0 for empty student stroke', () => {
    const target = [{ x1: 100, y1: 100, x2: 200, y2: 100 }];
    const score = iouScore([], target, { maskSize: 500, dilatePx: 4 });
    expect(score).toBe(0);
  });
});
