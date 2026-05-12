// tests/builder.init.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { init } from '../_engine/builder.js';

const baseConfig = {
  id: 'test-ex',
  title: 'Test Exercise',
  interactionCode: 'BD_T',
  intro_fr: 'Faire quelque chose.',
  mode: 'build',
  toolbox: ['forward', 'turn-right', 'repeat'],
  validation: { mode: 'none' },
  targetShape: null,
  starterProgramme: []
};

describe('init', () => {
  let root;
  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('renders header with title and intro', () => {
    init(root, baseConfig);
    expect(root.querySelector('.app-header h1').textContent).toBe('Test Exercise');
    expect(root.querySelector('.intro').textContent).toContain('Faire quelque chose');
  });

  it('renders toolbox with the configured block types', () => {
    init(root, baseConfig);
    expect(root.querySelectorAll('.toolbox-block').length).toBe(3);
  });

  it('renders Execute, Reset, and Abort buttons', () => {
    init(root, baseConfig);
    expect(root.querySelector('.btn-execute')).toBeTruthy();
    expect(root.querySelector('.btn-reset')).toBeTruthy();
    expect(root.querySelector('.btn-abort')).toBeTruthy();
  });

  it('renders an SVG canvas inside .canvas-pane', () => {
    init(root, baseConfig);
    expect(root.querySelector('.canvas-pane svg')).toBeTruthy();
  });

  it('starts with abort button hidden', () => {
    init(root, baseConfig);
    expect(root.querySelector('.btn-abort').classList.contains('hidden')).toBe(true);
  });

  it('renders student inputs when provided', () => {
    init(root, {
      ...baseConfig,
      studentInputs: [{ id: 'n', type: 'integer', label: 'N', min: 3, max: 8, default: 5 }]
    });
    expect(root.querySelector('.student-inputs')).toBeTruthy();
    expect(root.querySelector('input[type="range"][data-input-id="n"]')).toBeTruthy();
  });

  it('renders programme with starterProgramme blocks (fill mode)', () => {
    const fillConfig = {
      ...baseConfig,
      mode: 'fill',
      starterProgramme: [
        { id: 'b1', type: 'forward', params: { distance: 100 } }
      ],
      editableSlots: ['b1.distance']
    };
    init(root, fillConfig);
    const block = root.querySelector('.programme .block[data-block-id="b1"]');
    expect(block).toBeTruthy();
  });
});
