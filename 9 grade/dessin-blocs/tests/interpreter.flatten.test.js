import { describe, it, expect } from 'vitest';
import { flatten } from '../_engine/interpreter.js';

describe('flatten', () => {
  it('returns commands in order for a flat programme', () => {
    const programme = [
      { id: 'b1', type: 'forward', params: { distance: 100 } },
      { id: 'b2', type: 'turn-right', params: { angle: 90 } }
    ];
    expect(flatten(programme)).toEqual([
      { type: 'forward', params: { distance: 100 } },
      { type: 'turn-right', params: { angle: 90 } }
    ]);
  });

  it('expands repeat blocks N times', () => {
    const programme = [
      { id: 'b1', type: 'repeat', params: { times: 3 }, children: [
        { id: 'b2', type: 'forward', params: { distance: 50 } }
      ]}
    ];
    expect(flatten(programme).length).toBe(3);
    expect(flatten(programme)[0]).toEqual({ type: 'forward', params: { distance: 50 } });
  });

  it('throws on nesting deeper than MAX_LOOP_DEPTH (4)', () => {
    const nested = (n) => n === 0
      ? [{ id: 'leaf', type: 'forward', params: { distance: 1 } }]
      : [{ id: `r${n}`, type: 'repeat', params: { times: 2 }, children: nested(n - 1) }];
    expect(() => flatten(nested(5))).toThrow(/depth/);
  });

  it('throws when total commands exceed MAX_COMMANDS (5000)', () => {
    const programme = [
      { id: 'b1', type: 'repeat', params: { times: 6000 }, children: [
        { id: 'b2', type: 'forward', params: { distance: 1 } }
      ]}
    ];
    expect(() => flatten(programme)).toThrow(/MAX_COMMANDS/);
  });
});
