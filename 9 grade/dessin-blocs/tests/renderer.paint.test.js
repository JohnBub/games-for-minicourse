// tests/renderer.paint.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { paintSvg, paintTurtle, Turtle } from '../_engine/renderer.js';

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

describe('paintTurtle', () => {
  let svg;
  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  });

  it('appends a .turtle-marker group at the turtle position + heading', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.x = 100; t.y = 200; t.heading = 90;
    paintTurtle(svg, t);
    const g = svg.querySelector('.turtle-marker');
    expect(g).toBeTruthy();
    expect(g.getAttribute('transform')).toContain('translate(100, 200)');
    expect(g.getAttribute('transform')).toContain('rotate(90)');
  });

  it('replaces the existing turtle on repaint (no duplicates)', () => {
    const t = new Turtle({ width: 500, height: 500 });
    paintTurtle(svg, t);
    t.x = 300;
    paintTurtle(svg, t);
    expect(svg.querySelectorAll('.turtle-marker')).toHaveLength(1);
  });
});

import { animate } from '../_engine/renderer.js';

describe('animate', () => {
  let svg, studentLayer;
  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    studentLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(studentLayer);
  });

  it('commits the move to turtle.segments with the right endpoints', async () => {
    const t = new Turtle({ width: 500, height: 500 });
    // Use a tiny distance so the RAF-driven tween finishes in 1 frame
    await animate(svg, studentLayer, t, { type: 'forward', params: { distance: 100 } }, { speedMultiplier: 10000 });
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0].x1).toBeCloseTo(250);
    expect(t.segments[0].y1).toBeCloseTo(250);
    expect(t.segments[0].y2).toBeCloseTo(150); // heading 0 = up → y decreases
    expect(t.x).toBeCloseTo(250);
    expect(t.y).toBeCloseTo(150);
  });

  it('rotates turtle heading on turn-right', async () => {
    const t = new Turtle({ width: 500, height: 500 });
    await animate(svg, studentLayer, t, { type: 'turn-right', params: { angle: 90 } }, { speedMultiplier: 10000 });
    expect(t.heading).toBe(90);
    expect(t.segments).toHaveLength(0);
  });

  it('applies pen-up instantly with no segment', async () => {
    const t = new Turtle({ width: 500, height: 500 });
    await animate(svg, studentLayer, t, { type: 'pen-up', params: {} });
    expect(t.penDown).toBe(false);
    expect(t.segments).toHaveLength(0);
  });

  it('skips painting a segment while pen is up', async () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.penDown = false;
    await animate(svg, studentLayer, t, { type: 'forward', params: { distance: 50 } }, { speedMultiplier: 10000 });
    expect(t.segments).toHaveLength(0);
    expect(t.y).toBeCloseTo(200); // still moved
  });

  it('rejects when aborted via signal', async () => {
    const t = new Turtle({ width: 500, height: 500 });
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      animate(svg, studentLayer, t, { type: 'forward', params: { distance: 100 } }, { signal: ctrl.signal })
    ).rejects.toThrow(/abort/i);
  });
});
