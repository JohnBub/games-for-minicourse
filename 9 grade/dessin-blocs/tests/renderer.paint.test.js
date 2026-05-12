// tests/renderer.paint.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { paintSvg } from '../_engine/renderer.js';

describe('paintSvg', () => {
  let svg;
  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 500 500');
  });

  it('appends one <line> per segment', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 10, y2: 10, color: '#BF5A24' },
      { x1: 10, y1: 10, x2: 20, y2: 0, color: '#1F4D3C' }
    ];
    paintSvg(svg, segments);
    expect(svg.querySelectorAll('line')).toHaveLength(2);
    expect(svg.querySelector('line').getAttribute('stroke')).toBe('#BF5A24');
  });

  it('clears existing children before painting', () => {
    const stale = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    svg.appendChild(stale);
    paintSvg(svg, [{ x1: 0, y1: 0, x2: 10, y2: 10, color: '#000' }]);
    expect(svg.children.length).toBe(1);
  });
});
