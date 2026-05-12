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
