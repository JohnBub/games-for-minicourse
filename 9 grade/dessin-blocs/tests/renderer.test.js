import { describe, it, expect } from 'vitest';
import { Turtle } from '../_engine/renderer.js';

describe('Turtle', () => {
  it('starts at center, heading north (up), pen down, color black', () => {
    const t = new Turtle({ width: 500, height: 500 });
    expect(t.x).toBe(250);
    expect(t.y).toBe(250);
    expect(t.heading).toBe(0);     // 0 = up
    expect(t.penDown).toBe(true);
    expect(t.color).toBe('#000');
  });

  it('forward(100) moves 100 px in the heading direction', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'forward', params: { distance: 100 } });
    // heading 0 = up, so y decreases
    expect(t.x).toBeCloseTo(250);
    expect(t.y).toBeCloseTo(150);
  });

  it('turn-right(90) rotates heading by +90', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'turn-right', params: { angle: 90 } });
    expect(t.heading).toBe(90);
  });

  it('forward + turn-right(90) + forward draws an L', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'forward', params: { distance: 100 } });
    t.run({ type: 'turn-right', params: { angle: 90 } });
    t.run({ type: 'forward', params: { distance: 50 } });
    expect(t.x).toBeCloseTo(300);  // moved right 50
    expect(t.y).toBeCloseTo(150);
  });

  it('records segments as {x1,y1,x2,y2,color} when pen is down', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'forward', params: { distance: 100 } });
    expect(t.segments).toEqual([
      { x1: 250, y1: 250, x2: 250, y2: 150, color: '#000' }
    ]);
  });

  it('omits segment when pen is up', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'pen-up' });
    t.run({ type: 'forward', params: { distance: 100 } });
    expect(t.segments).toHaveLength(0);
  });

  it('set-color changes subsequent segment colors', () => {
    const t = new Turtle({ width: 500, height: 500 });
    t.run({ type: 'set-color', params: { color: '#BF5A24' } });
    t.run({ type: 'forward', params: { distance: 10 } });
    expect(t.segments[0].color).toBe('#BF5A24');
  });
});
