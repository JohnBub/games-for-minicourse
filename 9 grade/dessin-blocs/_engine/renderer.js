// _engine/renderer.js

export class Turtle {
  constructor({ width = 500, height = 500 } = {}) {
    this.width = width;
    this.height = height;
    this.x = width / 2;
    this.y = height / 2;
    this.heading = 0;       // degrees, 0 = up
    this.penDown = true;
    this.color = '#000';
    this.segments = [];     // {x1,y1,x2,y2,color}
  }

  run(cmd) {
    switch (cmd.type) {
      case 'forward':  return this.#move(+cmd.params.distance);
      case 'back':     return this.#move(-cmd.params.distance);
      case 'turn-right': this.heading = (this.heading + cmd.params.angle) % 360; return;
      case 'turn-left':  this.heading = (this.heading - cmd.params.angle + 360) % 360; return;
      case 'pen-up':   this.penDown = false; return;
      case 'pen-down': this.penDown = true; return;
      case 'set-color': this.color = cmd.params.color; return;
      default: throw new Error(`Unknown command: ${cmd.type}`);
    }
  }

  #move(distance) {
    const rad = (this.heading - 90) * Math.PI / 180; // 0=up
    const x2 = this.x + distance * Math.cos(rad);
    const y2 = this.y + distance * Math.sin(rad);
    if (this.penDown) {
      this.segments.push({ x1: this.x, y1: this.y, x2, y2, color: this.color });
    }
    this.x = x2;
    this.y = y2;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function paintSvg(svg, segments, { strokeWidth = 3 } = {}) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  for (const s of segments) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', s.x1);
    line.setAttribute('y1', s.y1);
    line.setAttribute('x2', s.x2);
    line.setAttribute('y2', s.y2);
    line.setAttribute('stroke', s.color);
    line.setAttribute('stroke-width', strokeWidth);
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
}

// Animation speed defaults. Tune these to taste — they're the only
// numbers a teacher would ever change. The auto speedMultiplier
// passed by builder.js scales these up for long programmes.
export const MOVE_PX_PER_SEC = 600;
export const TURN_DEG_PER_SEC = 720;

// Animates a single command. Updates turtle.x/y/heading gradually each
// RAF tick; commits the resulting line segment to turtle.segments at the end.
// For non-geometric commands (pen up/down, set-color) just applies the change.
export async function animate(svg, studentLayer, turtle, cmd, { signal, speedMultiplier = 1 } = {}) {
  if (signal?.aborted) throw new Error('Execution aborted');

  if (cmd.type === 'pen-up' || cmd.type === 'pen-down' || cmd.type === 'set-color') {
    turtle.run(cmd);
    paintTurtle(svg, turtle);
    return;
  }

  if (cmd.type === 'forward' || cmd.type === 'back') {
    const distance = cmd.params.distance * (cmd.type === 'forward' ? 1 : -1);
    const rad = (turtle.heading - 90) * Math.PI / 180;
    const startX = turtle.x;
    const startY = turtle.y;
    const endX = startX + distance * Math.cos(rad);
    const endY = startY + distance * Math.sin(rad);
    const totalMs = Math.abs(distance) / (MOVE_PX_PER_SEC * speedMultiplier) * 1000;
    const penDown = turtle.penDown;
    const color = turtle.color;
    const priorSegments = turtle.segments;

    await tween(totalMs, signal, (t) => {
      turtle.x = startX + (endX - startX) * t;
      turtle.y = startY + (endY - startY) * t;
      if (penDown && studentLayer) {
        const live = { x1: startX, y1: startY, x2: turtle.x, y2: turtle.y, color };
        paintSvg(studentLayer, [...priorSegments, live]);
      }
      paintTurtle(svg, turtle);
    });

    turtle.x = endX;
    turtle.y = endY;
    if (penDown) {
      turtle.segments.push({ x1: startX, y1: startY, x2: endX, y2: endY, color });
      if (studentLayer) paintSvg(studentLayer, turtle.segments);
    }
    paintTurtle(svg, turtle);
    return;
  }

  if (cmd.type === 'turn-left' || cmd.type === 'turn-right') {
    const delta = cmd.params.angle * (cmd.type === 'turn-right' ? 1 : -1);
    const startHeading = turtle.heading;
    const totalMs = Math.abs(delta) / (TURN_DEG_PER_SEC * speedMultiplier) * 1000;

    await tween(totalMs, signal, (t) => {
      turtle.heading = startHeading + delta * t;
      paintTurtle(svg, turtle);
    });

    turtle.heading = ((startHeading + delta) % 360 + 360) % 360;
    paintTurtle(svg, turtle);
    return;
  }

  // Unknown command: best-effort apply
  turtle.run(cmd);
  paintTurtle(svg, turtle);
}

function tween(totalMs, signal, onFrame) {
  return new Promise((resolve, reject) => {
    const dur = Math.max(totalMs, 16);
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const raf = typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame
      : (cb) => setTimeout(() => cb((typeof performance !== 'undefined' ? performance.now() : Date.now())), 16);

    function frame(now) {
      if (signal?.aborted) { reject(new Error('Execution aborted')); return; }
      const t = Math.min(1, (now - startTime) / dur);
      try { onFrame(t); } catch (e) { reject(e); return; }
      if (t < 1) raf(frame);
      else resolve();
    }
    raf(frame);
  });
}

// Paints a visible turtle marker (rust-coloured triangle with shell dot)
// at the turtle's current position, rotated to its heading.
// 0° heading = pointing up.
export function paintTurtle(svg, turtle) {
  const existing = svg.querySelector('.turtle-marker');
  if (existing) existing.remove();

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'turtle-marker');
  g.setAttribute('transform', `translate(${turtle.x}, ${turtle.y}) rotate(${turtle.heading})`);

  // Body (oval shell)
  const body = document.createElementNS(SVG_NS, 'ellipse');
  body.setAttribute('cx', '0');
  body.setAttribute('cy', '2');
  body.setAttribute('rx', '10');
  body.setAttribute('ry', '12');
  body.setAttribute('fill', '#1F4D3C');
  body.setAttribute('stroke', '#0F2A1F');
  body.setAttribute('stroke-width', '1.5');
  g.appendChild(body);

  // Head (small circle pointing forward = upward in local coords)
  const head = document.createElementNS(SVG_NS, 'circle');
  head.setAttribute('cx', '0');
  head.setAttribute('cy', '-11');
  head.setAttribute('r', '4');
  head.setAttribute('fill', '#BF5A24');
  head.setAttribute('stroke', '#0F2A1F');
  head.setAttribute('stroke-width', '1');
  g.appendChild(head);

  // Direction indicator (tiny triangle nose)
  const nose = document.createElementNS(SVG_NS, 'polygon');
  nose.setAttribute('points', '0,-17 -2,-13 2,-13');
  nose.setAttribute('fill', '#0F2A1F');
  g.appendChild(nose);

  svg.appendChild(g);
}
