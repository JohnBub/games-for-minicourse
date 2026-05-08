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

// (append to end of tests/validator.geometric.test.js)

describe('runGeometric — sideCount', () => {
  // Helper: build a regular polygon with N sides
  const polySegments = (n, size = 100) => {
    const segs = [];
    let x = 0, y = 0, heading = 0;
    const sideAngle = 360 / n;
    for (let i = 0; i < n; i++) {
      const rad = (heading - 90) * Math.PI / 180;
      const x2 = x + size * Math.cos(rad);
      const y2 = y + size * Math.sin(rad);
      segs.push({ x1: x, y1: y, x2, y2 });
      x = x2; y = y2;
      heading = (heading + sideAngle) % 360;
    }
    return segs;
  };

  it('passes when actual side count matches expected', () => {
    const r = runGeometric(polySegments(4), [{ check: 'sideCount', expected: 4 }]);
    expect(r.pass).toBe(true);
  });

  it('fails when count differs', () => {
    const r = runGeometric(polySegments(5), [{ check: 'sideCount', expected: 4 }]);
    expect(r.pass).toBe(false);
  });

  it('uses studentInputs lookup with expectedFrom', () => {
    const r = runGeometric(polySegments(6), [{ check: 'sideCount', expectedFrom: 'studentInputs.n' }], { studentInputs: { n: 6 } });
    expect(r.pass).toBe(true);
  });
});

describe('runGeometric — equalSides', () => {
  it('passes when sides are equal within tolerance (perfect square)', () => {
    const segs = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 0, y2: 100 },
      { x1: 0, y1: 100, x2: 0, y2: 0 }
    ];
    const r = runGeometric(segs, [{ check: 'equalSides', maxVarianceRatio: 0.15 }]);
    expect(r.pass).toBe(true);
  });

  it('fails when sides differ beyond ratio (rectangle 100x50)', () => {
    const segs = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 50 },
      { x1: 100, y1: 50, x2: 0, y2: 50 },
      { x1: 0, y1: 50, x2: 0, y2: 0 }
    ];
    const r = runGeometric(segs, [{ check: 'equalSides', maxVarianceRatio: 0.15 }]);
    expect(r.pass).toBe(false);
  });
});
