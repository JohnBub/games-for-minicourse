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

import { insertBlock, removeBlock } from '../_engine/builder.js';

describe('insertBlock (pure data mutation)', () => {
  it('inserts a new block at top-level index 0 in empty programme', () => {
    const out = insertBlock([], { insertIndex: 0 }, { id: 'b1', type: 'forward', params: { distance: 100 } });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b1');
  });

  it('inserts at the end of a non-empty programme', () => {
    const before = [{ id: 'b1', type: 'forward', params: { distance: 1 } }];
    const out = insertBlock(before, { insertIndex: 1 }, { id: 'b2', type: 'forward', params: { distance: 2 } });
    expect(out.map(b => b.id)).toEqual(['b1', 'b2']);
    expect(before).toHaveLength(1);  // input not mutated
  });

  it('inserts INTO a repeat block when parentId matches', () => {
    const before = [{ id: 'r1', type: 'repeat', params: { times: 4 }, children: [] }];
    const out = insertBlock(before, { insertIndex: 0, parentId: 'r1' }, { id: 'b2', type: 'forward', params: { distance: 50 } });
    expect(out[0].children).toHaveLength(1);
    expect(out[0].children[0].id).toBe('b2');
  });

  it('rejects an invalid block', () => {
    expect(() => insertBlock([], { insertIndex: 0 }, { id: 'x', type: 'unknown', params: {} })).toThrow(/invalid|unknown/i);
  });
});

describe('removeBlock', () => {
  it('removes a top-level block by id', () => {
    const before = [
      { id: 'b1', type: 'forward', params: { distance: 1 } },
      { id: 'b2', type: 'forward', params: { distance: 2 } }
    ];
    const out = removeBlock(before, 'b1');
    expect(out.map(b => b.id)).toEqual(['b2']);
  });

  it('removes a nested block inside a repeat', () => {
    const before = [{
      id: 'r1', type: 'repeat', params: { times: 4 },
      children: [{ id: 'c1', type: 'forward', params: { distance: 1 } }]
    }];
    const out = removeBlock(before, 'c1');
    expect(out[0].children).toHaveLength(0);
  });

  it('returns the same shape if id not found', () => {
    const before = [{ id: 'b1', type: 'forward', params: { distance: 1 } }];
    const out = removeBlock(before, 'nope');
    expect(out).toHaveLength(1);
  });
});

import { applyFillMode } from '../_engine/builder.js';

describe('applyFillMode', () => {
  function setupProgramme() {
    const programme = [{
      id: 'r1', type: 'repeat', params: { times: 4 },
      children: [
        { id: 'b2', type: 'forward', params: { distance: null } },
        { id: 'b3', type: 'turn-right', params: { angle: null } }
      ]
    }];
    return renderProgramme(programme);
  }

  it('disables inputs not in editableSlots', () => {
    const p = setupProgramme();
    applyFillMode(p, ['b2.distance']);  // only b2.distance editable
    const lockedInput = p.querySelector('input[data-block-id="r1"][data-param="times"]');
    expect(lockedInput.disabled).toBe(true);
    expect(lockedInput.readOnly).toBe(true);
    expect(lockedInput.classList.contains('block-input--locked')).toBe(true);
  });

  it('highlights editable inputs', () => {
    const p = setupProgramme();
    applyFillMode(p, ['b2.distance']);
    const editable = p.querySelector('input[data-block-id="b2"][data-param="distance"]');
    expect(editable.disabled).toBe(false);
    expect(editable.readOnly).toBe(false);
    expect(editable.classList.contains('block-input--editable')).toBe(true);
  });

  it('locks all inputs when editableSlots is empty', () => {
    const p = setupProgramme();
    applyFillMode(p, []);
    const inputs = p.querySelectorAll('input[data-param]');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach(i => {
      expect(i.disabled).toBe(true);
    });
  });

  it('handles multiple editable slots', () => {
    const p = setupProgramme();
    applyFillMode(p, ['b2.distance', 'b3.angle']);
    const dInp = p.querySelector('input[data-block-id="b2"][data-param="distance"]');
    const aInp = p.querySelector('input[data-block-id="b3"][data-param="angle"]');
    expect(dInp.disabled).toBe(false);
    expect(aInp.disabled).toBe(false);
  });
});

import { attachStepMode } from '../_engine/builder.js';

describe('attachStepMode', () => {
  it('calls onTap with type and default params when toolbox block is clicked', () => {
    const tb = renderToolbox(['forward', 'turn-right']);
    document.body.appendChild(tb);
    const taps = [];
    attachStepMode(tb, (event) => taps.push(event));
    const fwd = tb.querySelector('.toolbox-block[data-template-type="forward"]');
    fwd.click();
    expect(taps.length).toBe(1);
    expect(taps[0].type).toBe('forward');
    expect(taps[0].defaultParams.distance).toBe(100);
    tb.remove();
  });

  it('handles multiple taps in sequence', () => {
    const tb = renderToolbox(['forward', 'turn-right']);
    document.body.appendChild(tb);
    const taps = [];
    attachStepMode(tb, (event) => taps.push(event));
    tb.querySelector('[data-template-type="forward"]').click();
    tb.querySelector('[data-template-type="turn-right"]').click();
    tb.querySelector('[data-template-type="forward"]').click();
    expect(taps.map(t => t.type)).toEqual(['forward', 'turn-right', 'forward']);
    tb.remove();
  });

  it('ignores clicks on non-toolbox-block elements', () => {
    const tb = renderToolbox(['forward']);
    const stranger = document.createElement('div');
    tb.appendChild(stranger);
    document.body.appendChild(tb);
    const taps = [];
    attachStepMode(tb, (event) => taps.push(event));
    stranger.click();
    expect(taps.length).toBe(0);
    tb.remove();
  });
});

import { renderStudentInputs } from '../_engine/builder.js';

describe('renderStudentInputs', () => {
  it('renders a range slider for an integer input', () => {
    const el = renderStudentInputs(
      [{ id: 'n', type: 'integer', label: 'N (côtés)', min: 3, max: 8, default: 5 }],
      () => {}
    );
    expect(el.classList.contains('student-inputs')).toBe(true);
    const range = el.querySelector('input[type="range"]');
    expect(range).toBeTruthy();
    expect(range.min).toBe('3');
    expect(range.max).toBe('8');
    expect(range.value).toBe('5');
    expect(range.dataset.inputId).toBe('n');
  });

  it('shows the label and a numeric readout', () => {
    const el = renderStudentInputs(
      [{ id: 'n', type: 'integer', label: 'N (côtés)', min: 3, max: 8, default: 5 }],
      () => {}
    );
    expect(el.querySelector('.student-input-label').textContent).toBe('N (côtés)');
    expect(el.querySelector('.student-input-readout').textContent).toBe('5');
  });

  it('calls onChange with object { id: value } on input', () => {
    let received = null;
    const el = renderStudentInputs(
      [{ id: 'n', type: 'integer', label: 'N', min: 3, max: 8, default: 5 }],
      (state) => { received = state; }
    );
    const range = el.querySelector('input[type="range"]');
    range.value = '7';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    expect(received).toEqual({ n: 7 });
  });

  it('updates the readout when slider changes', () => {
    const el = renderStudentInputs(
      [{ id: 'n', type: 'integer', label: 'N', min: 3, max: 8, default: 5 }],
      () => {}
    );
    const range = el.querySelector('input[type="range"]');
    range.value = '6';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.querySelector('.student-input-readout').textContent).toBe('6');
  });

  it('handles multiple inputs', () => {
    let received = null;
    const el = renderStudentInputs(
      [
        { id: 'n', type: 'integer', label: 'N', min: 3, max: 8, default: 5 },
        { id: 'size', type: 'integer', label: 'Taille', min: 50, max: 200, default: 100 }
      ],
      (state) => { received = state; }
    );
    expect(el.querySelectorAll('input[type="range"]').length).toBe(2);
    el.querySelector('input[data-input-id="size"]').value = '150';
    el.querySelector('input[data-input-id="size"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(received).toEqual({ n: 5, size: 150 });
  });
});
