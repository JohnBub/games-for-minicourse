// tests/builder.render.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderBlock } from '../_engine/builder.js';

describe('renderBlock', () => {
  it('renders a forward block with mouvement class and rust border', () => {
    const el = renderBlock({ id: 'b1', type: 'forward', params: { distance: 100 } });
    expect(el.classList.contains('block')).toBe(true);
    expect(el.classList.contains('block--mouvement')).toBe(true);
    expect(el.dataset.blockId).toBe('b1');
    expect(el.dataset.blockType).toBe('forward');
    // border-color inline style should match rust
    expect(el.style.borderColor.replace(/\s+/g, '')).toMatch(/^(#bf5a24|rgb\(191,90,36\))$/i);
  });

  it('renders the distance input with data-param + value', () => {
    const el = renderBlock({ id: 'b1', type: 'forward', params: { distance: 100 } });
    const input = el.querySelector('input[data-param="distance"]');
    expect(input).toBeTruthy();
    expect(input.value).toBe('100');
    expect(input.dataset.blockId).toBe('b1');
  });

  it('renders a repeat block with a .block-children slot for nested blocks', () => {
    const el = renderBlock({ id: 'b1', type: 'repeat', params: { times: 4 }, children: [] });
    expect(el.querySelector('.block-children')).toBeTruthy();
  });

  it('recursively renders nested children inside repeat', () => {
    const el = renderBlock({
      id: 'b1', type: 'repeat', params: { times: 4 },
      children: [{ id: 'b2', type: 'forward', params: { distance: 50 } }]
    });
    const child = el.querySelector('.block-children .block');
    expect(child).toBeTruthy();
    expect(child.dataset.blockId).toBe('b2');
  });

  it('uses textContent for label (no innerHTML)', () => {
    // We can't directly test absence of innerHTML calls, but we can check the
    // label element exists and has only text content.
    const el = renderBlock({ id: 'b1', type: 'forward', params: { distance: 1 } });
    const label = el.querySelector('.block-label');
    expect(label).toBeTruthy();
    expect(label.textContent).toBe('avancer');
  });

  it('renders pen-up block with no input controls', () => {
    const el = renderBlock({ id: 'b1', type: 'pen-up', params: {} });
    expect(el.querySelector('input[data-param]')).toBeNull();
    expect(el.querySelector('.block-label').textContent).toBe('lever stylo');
  });

  it('renders set-color block with a color input', () => {
    const el = renderBlock({ id: 'b1', type: 'set-color', params: { color: '#BF5A24' } });
    const input = el.querySelector('input[data-param="color"]');
    expect(input).toBeTruthy();
    expect(input.type).toBe('color');
  });
});

import { renderToolbox, renderProgramme } from '../_engine/builder.js';

describe('renderToolbox', () => {
  it('renders one template block per type id', () => {
    const tb = renderToolbox(['forward', 'turn-right', 'repeat']);
    expect(tb.classList.contains('toolbox')).toBe(true);
    const blocks = tb.querySelectorAll('.toolbox-block');
    expect(blocks.length).toBe(3);
  });

  it('toolbox blocks carry data-template-type for drag handlers', () => {
    const tb = renderToolbox(['forward']);
    const block = tb.querySelector('.toolbox-block');
    expect(block.dataset.templateType).toBe('forward');
    expect(block.querySelector('.block-label').textContent).toBe('avancer');
  });

  it('throws on unknown block type id', () => {
    expect(() => renderToolbox(['nope'])).toThrow(/Unknown/);
  });

  it('returns an empty toolbox when given empty list', () => {
    const tb = renderToolbox([]);
    expect(tb.classList.contains('toolbox')).toBe(true);
    expect(tb.querySelectorAll('.toolbox-block').length).toBe(0);
  });
});

describe('renderProgramme', () => {
  it('wraps blocks in .programme container', () => {
    const p = renderProgramme([
      { id: 'b1', type: 'forward', params: { distance: 100 } }
    ]);
    expect(p.classList.contains('programme')).toBe(true);
    expect(p.querySelectorAll('.block').length).toBeGreaterThanOrEqual(1);
  });

  it('inserts drop zones BETWEEN and AROUND blocks', () => {
    // For 2 blocks → 3 drop zones (before, between, after)
    const p = renderProgramme([
      { id: 'b1', type: 'forward', params: { distance: 1 } },
      { id: 'b2', type: 'forward', params: { distance: 2 } }
    ]);
    const zones = p.querySelectorAll(':scope > .drop-zone');
    expect(zones.length).toBe(3);
  });

  it('empty programme still has one drop zone for first insert', () => {
    const p = renderProgramme([]);
    const zones = p.querySelectorAll(':scope > .drop-zone');
    expect(zones.length).toBe(1);
  });

  it('drop zones inside repeat children for build-mode nesting', () => {
    const p = renderProgramme([
      { id: 'r1', type: 'repeat', params: { times: 4 }, children: [] }
    ]);
    const repeatChildren = p.querySelector('.block-children');
    expect(repeatChildren.querySelector('.drop-zone')).toBeTruthy();
  });
});
