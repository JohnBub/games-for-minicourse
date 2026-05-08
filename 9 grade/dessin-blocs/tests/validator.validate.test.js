import { describe, it, expect } from 'vitest';
import { validate } from '../_engine/validator.js';

const config = (overrides = {}) => ({
  validation: {
    mode: 'lenient',
    iou: 0.7,
    geometric: [
      { check: 'closed', maxGapPx: 10 },
      { check: 'sideCount', expected: 4 }
    ]
  },
  targetShape: { kind: 'regularPolygon', sides: 4, size: 100, center: [250, 250] },
  ...overrides
});

describe('validate', () => {
  it('returns French hint when path not closed', () => {
    const segments = [{ x1: 0, y1: 0, x2: 50, y2: 0 }];
    const r = validate(segments, config(), {});
    expect(r.pass).toBe(false);
    expect(r.hint).toBe("Ta forme n'est pas fermée.");
  });

  it('returns French hint when sideCount differs', () => {
    // Triangle (3 sides) vs expected 4
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 50, y2: 86.6 },
      { x1: 50, y1: 86.6, x2: 0, y2: 0 }
    ];
    const r = validate(segments, config(), {});
    expect(r.pass).toBe(false);
    expect(r.hint).toContain("côtés");
    expect(r.hint).toContain("3");
    expect(r.hint).toContain("4");
  });

  it('returns null hint and pass=true on perfect match', () => {
    // Build a 100x100 square at center (250,250) — matches target exactly
    const cx = 250, cy = 250, half = 50;
    const segments = [
      { x1: cx - half, y1: cy - half, x2: cx + half, y2: cy - half },
      { x1: cx + half, y1: cy - half, x2: cx + half, y2: cy + half },
      { x1: cx + half, y1: cy + half, x2: cx - half, y2: cy + half },
      { x1: cx - half, y1: cy + half, x2: cx - half, y2: cy - half }
    ];
    const r = validate(segments, config(), {});
    expect(r.pass).toBe(true);
    expect(r.hint).toBeNull();
  });

  it('skips IoU when validation mode is "none"', () => {
    const r = validate([], { validation: { mode: 'none' } }, {});
    expect(r.pass).toBe(true);
  });
});
