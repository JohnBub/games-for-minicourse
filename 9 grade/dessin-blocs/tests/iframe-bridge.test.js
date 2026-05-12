// tests/iframe-bridge.test.js
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { reportHeight, observeAndReport } from '../_engine/iframe-bridge.js';

describe('reportHeight', () => {
  it('posts SET_INSTRUCTION_HEIGHT to parent with interactionCode', () => {
    const spy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    reportHeight('BD_2', 720);
    expect(spy).toHaveBeenCalledWith({
      interactionCode: 'BD_2',
      type: 'SET_INSTRUCTION_HEIGHT',
      value: 720
    }, '*');
    spy.mockRestore();
  });
});

describe('observeAndReport', () => {
  it('reports initial height immediately', () => {
    const spy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    const el = document.createElement('div');
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ height: 480 })
    });
    document.body.appendChild(el);
    observeAndReport('BD_3', el);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ interactionCode: 'BD_3', type: 'SET_INSTRUCTION_HEIGHT', value: 480 }),
      '*'
    );
    spy.mockRestore();
    el.remove();
  });

  it('does not throw when ResizeObserver is undefined', () => {
    const original = global.ResizeObserver;
    global.ResizeObserver = undefined;
    const el = document.createElement('div');
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ height: 100 })
    });
    document.body.appendChild(el);
    expect(() => observeAndReport('BD_1', el)).not.toThrow();
    el.remove();
    global.ResizeObserver = original;
  });
});
