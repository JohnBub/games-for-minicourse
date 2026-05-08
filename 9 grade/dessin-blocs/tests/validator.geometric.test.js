// tests/validator.geometric.test.js
import { describe, it, expect } from 'vitest';
import { runGeometric } from '../_engine/validator.js';

describe('runGeometric — closed', () => {
  it('passes when last point is within maxGapPx of first', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 10 },
      { x1: 10, y1: 10, x2: 0, y2: 10 },
      { x1: 0, y1: 10, x2: 1, y2: 1 }   // gap = sqrt(2) ≈ 1.4
    ];
    const result = runGeometric(segments, [{ check: 'closed', maxGapPx: 5 }]);
    expect(result.pass).toBe(true);
  });

  it('fails when gap exceeds maxGapPx', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 50, y2: 50 } // huge gap from end (50,50) to start (0,0)
    ];
    const result = runGeometric(segments, [{ check: 'closed', maxGapPx: 5 }]);
    expect(result.pass).toBe(false);
    expect(result.failedCheck).toBe('closed');
  });

  it('returns pass=true with empty checks list', () => {
    expect(runGeometric([], [])).toEqual({ pass: true });
  });
});
