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
