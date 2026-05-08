import { describe, it, expect } from 'vitest';
import { BLOCK_TYPES, isValidBlock, CATEGORY_COLORS } from '../_engine/block-types.js';

describe('BLOCK_TYPES registry', () => {
  it('declares all 10 block types', () => {
    expect(Object.keys(BLOCK_TYPES).sort()).toEqual([
      'back','divide-360-by','forward','number','pen-down','pen-up',
      'repeat','set-color','turn-left','turn-right'
    ].sort());
  });

  it('forward is in mouvement category with rust color', () => {
    expect(BLOCK_TYPES.forward.category).toBe('mouvement');
    expect(BLOCK_TYPES.forward.color.toLowerCase()).toBe('#bf5a24');
    expect(BLOCK_TYPES.forward.label).toBe('avancer');
  });

  it('repeat accepts children', () => {
    expect(BLOCK_TYPES.repeat.accepts_children).toBe(true);
    expect(BLOCK_TYPES.forward.accepts_children).toBe(false);
  });

  it('CATEGORY_COLORS exposes all 4 categories', () => {
    expect(CATEGORY_COLORS.mouvement.toLowerCase()).toBe('#bf5a24');
    expect(CATEGORY_COLORS.stylo.toLowerCase()).toBe('#1f4d3c');
    expect(CATEGORY_COLORS.boucles.toLowerCase()).toBe('#b8893a');
    expect(CATEGORY_COLORS.maths.toLowerCase()).toBe('#1e2a4d');
  });
});

describe('isValidBlock', () => {
  it('accepts well-formed forward block', () => {
    expect(isValidBlock({ id: 'b1', type: 'forward', params: { distance: 100 } })).toBe(true);
  });

  it('accepts repeat block with empty children', () => {
    expect(isValidBlock({ id: 'b1', type: 'repeat', params: { times: 4 }, children: [] })).toBe(true);
  });

  it('rejects unknown type', () => {
    expect(isValidBlock({ id: 'b1', type: 'unknown', params: {} })).toBe(false);
  });

  it('rejects missing required params', () => {
    expect(isValidBlock({ id: 'b1', type: 'forward', params: {} })).toBe(false);
  });

  it('rejects missing id', () => {
    expect(isValidBlock({ type: 'forward', params: { distance: 100 } })).toBe(false);
  });
});
