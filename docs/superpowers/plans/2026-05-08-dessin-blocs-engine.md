# Dessin par Blocs — Implementation Plan (L1: Engine + Sandboxes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mini Block Builder engine, 7 per-exercise JSON configs, the wrapper generator, 7 live HTML sandboxes, and push them to GitHub Pages.

**Architecture:** Custom ~1500 LOC vanilla JS engine across 6 modules (`builder.js`, `interpreter.js`, `renderer.js`, `validator.js`, `iframe-bridge.js`, `builder.css`) with no library dependency. Per-exercise JSON configs drive 7 thin HTML wrappers, generated from a template by `stamp-wrappers.mjs`. Hosted on existing GitHub Pages of the `Games for MiniCourse` repo.

**Tech Stack:** Vanilla JS (no Blockly, no React). Vitest for unit tests. SVG for canvas. CSS variables for Renardo theme. Node 20+ for the generator script. No build step in production — wrappers are static HTML loading static JS.

**Spec reference:** `docs/superpowers/specs/2026-05-08-dessin-blocs-design.md`

**Out of scope (covered in separate plan):** L3 theory writing (21 markdown files in `Bonus_Dessin_Blocs/`). Static PDF generation via MiniCourse Generator. Classroom rollout.

---

## Phase A — Project bootstrap

### Task A1: Create folder structure + scaffolding files

**Files:**
- Create: `9 grade/dessin-blocs/README.md`
- Create: `9 grade/dessin-blocs/.gitignore`
- Create: `9 grade/dessin-blocs/package.json`
- Create: `9 grade/dessin-blocs/tests/.gitkeep`

- [ ] **Step 1: Make folders**

```bash
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
mkdir -p "9 grade/dessin-blocs/_engine/fonts"
mkdir -p "9 grade/dessin-blocs/exercises"
mkdir -p "9 grade/dessin-blocs/_build"
mkdir -p "9 grade/dessin-blocs/tests"
touch "9 grade/dessin-blocs/tests/.gitkeep"
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
.DS_Store
*.log
coverage/
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "dessin-blocs",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "stamp": "node _build/stamp-wrappers.mjs"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 4: Write `README.md`**

```markdown
# Dessin par Blocs

Mini-cours bonus pour Informatique 9e (Cycle d'orientation).
7 exercices de dessin avec un block builder maison.

Spec: `../docs/superpowers/specs/2026-05-08-dessin-blocs-design.md`

## Local development

    npm install
    npm test                    # run all tests
    npm run stamp               # regenerate 7 wrappers + index + embed-manifest

## Deploy

Pushed to `main` branch is auto-deployed by GitHub Pages.
```

- [ ] **Step 5: Install + commit**

```bash
cd "9 grade/dessin-blocs" && npm install
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
git add "9 grade/dessin-blocs/"
git commit -m "feat(dessin-blocs): scaffold folder structure + package.json"
```

---

### Task A2: Vendor fonts (Lora + Inter)

**Files:**
- Create: `9 grade/dessin-blocs/_engine/fonts/Lora-VariableFont_wght.ttf`
- Create: `9 grade/dessin-blocs/_engine/fonts/Inter-VariableFont_slnt,wght.ttf`
- Create: `9 grade/dessin-blocs/_engine/fonts.css`

- [ ] **Step 1: Download fonts from Google Fonts (one-time)**

```bash
cd "9 grade/dessin-blocs/_engine/fonts"
curl -L -o Inter.zip "https://fonts.google.com/download?family=Inter"
curl -L -o Lora.zip "https://fonts.google.com/download?family=Lora"
unzip -j Inter.zip "*VariableFont*.ttf" -d .
unzip -j Lora.zip "*VariableFont*.ttf" -d .
rm Inter.zip Lora.zip
ls *.ttf  # should list 2 .ttf files
```

- [ ] **Step 2: Write `fonts.css`**

```css
@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-VariableFont_slnt,wght.ttf') format('truetype-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Lora';
  src: url('./fonts/Lora-VariableFont_wght.ttf') format('truetype-variations');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
git add "9 grade/dessin-blocs/_engine/fonts/" "9 grade/dessin-blocs/_engine/fonts.css"
git commit -m "feat(dessin-blocs): vendor Lora + Inter fonts"
```

---

## Phase B — Interpreter (TDD)

### Task B1: Programme → command list (the AST flattener)

**Files:**
- Create: `9 grade/dessin-blocs/tests/interpreter.flatten.test.js`
- Create: `9 grade/dessin-blocs/_engine/interpreter.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/interpreter.flatten.test.js
import { describe, it, expect } from 'vitest';
import { flatten } from '../_engine/interpreter.js';

describe('flatten', () => {
  it('returns commands in order for a flat programme', () => {
    const programme = [
      { id: 'b1', type: 'forward', params: { distance: 100 } },
      { id: 'b2', type: 'turn-right', params: { angle: 90 } }
    ];
    expect(flatten(programme)).toEqual([
      { type: 'forward', params: { distance: 100 } },
      { type: 'turn-right', params: { angle: 90 } }
    ]);
  });

  it('expands repeat blocks N times', () => {
    const programme = [
      { id: 'b1', type: 'repeat', params: { times: 3 }, children: [
        { id: 'b2', type: 'forward', params: { distance: 50 } }
      ]}
    ];
    expect(flatten(programme).length).toBe(3);
    expect(flatten(programme)[0]).toEqual({ type: 'forward', params: { distance: 50 } });
  });

  it('throws on nesting deeper than MAX_LOOP_DEPTH (4)', () => {
    const nested = (n) => n === 0
      ? [{ id: 'leaf', type: 'forward', params: { distance: 1 } }]
      : [{ id: `r${n}`, type: 'repeat', params: { times: 2 }, children: nested(n - 1) }];
    expect(() => flatten(nested(5))).toThrow(/depth/);
  });

  it('throws when total commands exceed MAX_COMMANDS (5000)', () => {
    const programme = [
      { id: 'b1', type: 'repeat', params: { times: 6000 }, children: [
        { id: 'b2', type: 'forward', params: { distance: 1 } }
      ]}
    ];
    expect(() => flatten(programme)).toThrow(/MAX_COMMANDS/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd "9 grade/dessin-blocs" && npx vitest run tests/interpreter.flatten.test.js
# Expected: FAIL — module not found
```

- [ ] **Step 3: Write minimal `interpreter.js`**

```js
// _engine/interpreter.js
export const MAX_COMMANDS = 5000;
export const MAX_LOOP_DEPTH = 4;

export function flatten(programme, depth = 0) {
  if (depth > MAX_LOOP_DEPTH) {
    throw new Error(`Loop depth exceeds MAX_LOOP_DEPTH (${MAX_LOOP_DEPTH})`);
  }
  const out = [];
  for (const block of programme) {
    if (block.type === 'repeat') {
      const times = block.params.times | 0;
      for (let i = 0; i < times; i++) {
        out.push(...flatten(block.children || [], depth + 1));
        if (out.length > MAX_COMMANDS) {
          throw new Error(`Command count exceeds MAX_COMMANDS (${MAX_COMMANDS})`);
        }
      }
    } else {
      out.push({ type: block.type, params: block.params });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/interpreter.flatten.test.js
# Expected: 4 passed
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
git add "9 grade/dessin-blocs/_engine/interpreter.js" "9 grade/dessin-blocs/tests/interpreter.flatten.test.js"
git commit -m "feat(dessin-blocs): interpreter flatten with bounds (TDD)"
```

---

### Task B2: Batched executor with abort + timeout

**Files:**
- Create: `9 grade/dessin-blocs/tests/interpreter.execute.test.js`
- Modify: `9 grade/dessin-blocs/_engine/interpreter.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/interpreter.execute.test.js
import { describe, it, expect, vi } from 'vitest';
import { execute, COMMANDS_PER_FRAME, EXECUTION_TIMEOUT_MS } from '../_engine/interpreter.js';

describe('execute', () => {
  it('calls the runner once per command', async () => {
    const cmds = [
      { type: 'forward', params: { distance: 1 } },
      { type: 'forward', params: { distance: 2 } }
    ];
    const runner = vi.fn();
    await execute(cmds, runner);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner).toHaveBeenNthCalledWith(1, cmds[0]);
  });

  it('batches COMMANDS_PER_FRAME=200 commands per frame', () => {
    expect(COMMANDS_PER_FRAME).toBe(200);
  });

  it('aborts when controller signals abort', async () => {
    const cmds = Array(1000).fill({ type: 'forward', params: { distance: 1 } });
    const ac = new AbortController();
    let count = 0;
    const runner = () => { count++; if (count === 3) ac.abort(); };
    await expect(execute(cmds, runner, { signal: ac.signal })).rejects.toThrow(/abort/i);
    expect(count).toBeLessThan(1000);
  });

  it('times out after EXECUTION_TIMEOUT_MS=3000', () => {
    expect(EXECUTION_TIMEOUT_MS).toBe(3000);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run tests/interpreter.execute.test.js
# Expected: FAIL — execute not exported
```

- [ ] **Step 3: Add `execute` to `interpreter.js`**

```js
// append to _engine/interpreter.js

export const COMMANDS_PER_FRAME = 200;
export const EXECUTION_TIMEOUT_MS = 3000;

export async function execute(commands, runner, { signal } = {}) {
  const start = Date.now();
  for (let i = 0; i < commands.length; i += COMMANDS_PER_FRAME) {
    if (signal?.aborted) throw new Error('Execution aborted');
    if (Date.now() - start > EXECUTION_TIMEOUT_MS) {
      throw new Error('Execution timeout');
    }
    const batch = commands.slice(i, i + COMMANDS_PER_FRAME);
    for (const cmd of batch) {
      if (signal?.aborted) throw new Error('Execution aborted');
      runner(cmd);
    }
    await new Promise(r => requestAnimationFrame ? requestAnimationFrame(r) : setTimeout(r, 0));
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/interpreter.execute.test.js
# Expected: 4 passed
```

- [ ] **Step 5: Commit**

```bash
git add -A "9 grade/dessin-blocs/_engine/interpreter.js" "9 grade/dessin-blocs/tests/interpreter.execute.test.js"
git commit -m "feat(dessin-blocs): batched executor with abort + timeout (TDD)"
```

---

## Phase C — Renderer (turtle on SVG)

### Task C1: Turtle state + forward/turn (TDD)

**Files:**
- Create: `9 grade/dessin-blocs/tests/renderer.test.js`
- Create: `9 grade/dessin-blocs/_engine/renderer.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/renderer.test.js
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
```

- [ ] **Step 2: Run test, verify fail**

```bash
npx vitest run tests/renderer.test.js
# Expected: FAIL — module not found
```

- [ ] **Step 3: Write `renderer.js`**

```js
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
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/renderer.test.js
# Expected: 7 passed
```

- [ ] **Step 5: Commit**

```bash
git add "9 grade/dessin-blocs/_engine/renderer.js" "9 grade/dessin-blocs/tests/renderer.test.js"
git commit -m "feat(dessin-blocs): turtle renderer with forward/turn/pen/color (TDD)"
```

---

### Task C2: SVG paint function

**Files:**
- Create: `9 grade/dessin-blocs/tests/renderer.paint.test.js`
- Modify: `9 grade/dessin-blocs/_engine/renderer.js`

- [ ] **Step 1: Write the failing test**

Use `// @vitest-environment jsdom` directive.

```js
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
```

- [ ] **Step 2: Run test, verify fail**

```bash
npx vitest run tests/renderer.paint.test.js
# Expected: FAIL — paintSvg not exported
```

- [ ] **Step 3: Add `paintSvg` to `renderer.js`**

```js
// append to _engine/renderer.js

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
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/renderer.paint.test.js
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add -A "9 grade/dessin-blocs/_engine/renderer.js" "9 grade/dessin-blocs/tests/renderer.paint.test.js"
git commit -m "feat(dessin-blocs): paintSvg renders turtle segments to SVG (TDD)"
```

---

## Phase D — Validator (TDD)

### Task D1: Geometric checks scaffold + `closed`

**Files:**
- Create: `9 grade/dessin-blocs/tests/validator.geometric.test.js`
- Create: `9 grade/dessin-blocs/_engine/validator.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/validator.geometric.test.js
import { describe, it, expect } from 'vitest';
import { runGeometric } from '../_engine/validator.js';

describe('runGeometric — closed', () => {
  it('passes when last point is within maxGapPx of first', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 10 },
      { x1: 10, y1: 10, x2: 0, y2: 10 },
      { x1: 0, y1: 10, x2: 1, y2: 1 }   // gap = sqrt(2) ≈ 1.4
    ];
    const result = runGeometric(segments, [{ check: 'closed', maxGapPx: 5 }]);
    expect(result.pass).toBe(true);
  });

  it('fails when gap exceeds maxGapPx', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 50, y2: 50 } // huge gap from end (50,50) to start (0,0)
    ];
    const result = runGeometric(segments, [{ check: 'closed', maxGapPx: 5 }]);
    expect(result.pass).toBe(false);
    expect(result.failedCheck).toBe('closed');
  });

  it('returns pass=true with empty checks list', () => {
    expect(runGeometric([], [])).toEqual({ pass: true });
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: FAIL — module not found
```

- [ ] **Step 3: Write `validator.js`**

```js
// _engine/validator.js

const checkers = {
  closed(segments, opts) {
    if (segments.length === 0) return false;
    const first = segments[0];
    const last = segments[segments.length - 1];
    const dx = last.x2 - first.x1;
    const dy = last.y2 - first.y1;
    const gap = Math.hypot(dx, dy);
    return gap <= (opts.maxGapPx ?? 10);
  }
};

export function runGeometric(segments, checks) {
  for (const c of checks) {
    const fn = checkers[c.check];
    if (!fn) throw new Error(`Unknown check: ${c.check}`);
    if (!fn(segments, c)) {
      return { pass: false, failedCheck: c.check };
    }
  }
  return { pass: true };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add "9 grade/dessin-blocs/_engine/validator.js" "9 grade/dessin-blocs/tests/validator.geometric.test.js"
git commit -m "feat(dessin-blocs): validator scaffold + closed check (TDD)"
```

---

### Task D2: `sideCount` check (with expectedFrom support)

**Files:**
- Modify: `9 grade/dessin-blocs/tests/validator.geometric.test.js`
- Modify: `9 grade/dessin-blocs/_engine/validator.js`

- [ ] **Step 1: Append failing tests**

```js
// append to tests/validator.geometric.test.js

describe('runGeometric — sideCount', () => {
  // Helper: build a regular polygon with N sides
  const polySegments = (n, size = 100) => {
    const segs = [];
    let x = 0, y = 0, heading = 0;
    const sideAngle = 360 / n;
    for (let i = 0; i < n; i++) {
      const rad = (heading - 90) * Math.PI / 180;
      const x2 = x + size * Math.cos(rad);
      const y2 = y + size * Math.sin(rad);
      segs.push({ x1: x, y1: y, x2, y2 });
      x = x2; y = y2;
      heading = (heading + sideAngle) % 360;
    }
    return segs;
  };

  it('passes when actual side count matches expected', () => {
    const r = runGeometric(polySegments(4), [{ check: 'sideCount', expected: 4 }]);
    expect(r.pass).toBe(true);
  });

  it('fails when count differs', () => {
    const r = runGeometric(polySegments(5), [{ check: 'sideCount', expected: 4 }]);
    expect(r.pass).toBe(false);
  });

  it('uses studentInputs lookup with expectedFrom', () => {
    const r = runGeometric(polySegments(6), [{ check: 'sideCount', expectedFrom: 'studentInputs.n' }], { studentInputs: { n: 6 } });
    expect(r.pass).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: 3 of 6 fail
```

- [ ] **Step 3: Implement `sideCount` in `validator.js`**

Replace `checkers` and `runGeometric`:

```js
// _engine/validator.js — replace previous content

const SIDE_ANGLE_TOLERANCE_DEG = 8;

function angleBetween(a, b) {
  // a = (dx,dy) of segment N→N+1; b = (dx,dy) of segment N+1→N+2
  const dot = a.dx * b.dx + a.dy * b.dy;
  const det = a.dx * b.dy - a.dy * b.dx;
  return Math.abs(Math.atan2(det, dot) * 180 / Math.PI);
}

function detectSides(segments) {
  // Group consecutive segments that travel in nearly the same direction.
  if (segments.length === 0) return 0;
  let sides = 1;
  let prev = { dx: segments[0].x2 - segments[0].x1, dy: segments[0].y2 - segments[0].y1 };
  for (let i = 1; i < segments.length; i++) {
    const cur = { dx: segments[i].x2 - segments[i].x1, dy: segments[i].y2 - segments[i].y1 };
    if (angleBetween(prev, cur) > SIDE_ANGLE_TOLERANCE_DEG) sides++;
    prev = cur;
  }
  return sides;
}

function resolveExpected(check, ctx) {
  if (typeof check.expected === 'number') return check.expected;
  if (typeof check.expectedFrom === 'string') {
    return check.expectedFrom.split('.').reduce((o, k) => o?.[k], ctx);
  }
  throw new Error('sideCount needs expected or expectedFrom');
}

const checkers = {
  closed(segments, opts) {
    if (segments.length === 0) return false;
    const first = segments[0], last = segments[segments.length - 1];
    return Math.hypot(last.x2 - first.x1, last.y2 - first.y1) <= (opts.maxGapPx ?? 10);
  },
  sideCount(segments, opts, ctx) {
    const expected = resolveExpected(opts, ctx);
    return detectSides(segments) === expected;
  }
};

export function runGeometric(segments, checks, ctx = {}) {
  for (const c of checks) {
    const fn = checkers[c.check];
    if (!fn) throw new Error(`Unknown check: ${c.check}`);
    if (!fn(segments, c, ctx)) {
      return { pass: false, failedCheck: c.check };
    }
  }
  return { pass: true };
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: 6 passed
```

- [ ] **Step 5: Commit**

```bash
git add -A "9 grade/dessin-blocs/_engine/validator.js" "9 grade/dessin-blocs/tests/validator.geometric.test.js"
git commit -m "feat(dessin-blocs): validator sideCount with expectedFrom (TDD)"
```

---

### Task D3: `equalSides` check

**Files:**
- Modify: `9 grade/dessin-blocs/tests/validator.geometric.test.js`
- Modify: `9 grade/dessin-blocs/_engine/validator.js`

- [ ] **Step 1: Append failing tests**

```js
// append to tests/validator.geometric.test.js

describe('runGeometric — equalSides', () => {
  it('passes when sides are equal within tolerance', () => {
    const segs = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 0, y2: 100 },
      { x1: 0, y1: 100, x2: 0, y2: 0 }
    ];
    const r = runGeometric(segs, [{ check: 'equalSides', maxVarianceRatio: 0.15 }]);
    expect(r.pass).toBe(true);
  });

  it('fails when sides differ beyond ratio (rectangle 100x50)', () => {
    const segs = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 50 },
      { x1: 100, y1: 50, x2: 0, y2: 50 },
      { x1: 0, y1: 50, x2: 0, y2: 0 }
    ];
    const r = runGeometric(segs, [{ check: 'equalSides', maxVarianceRatio: 0.15 }]);
    expect(r.pass).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: 2 new tests fail
```

- [ ] **Step 3: Add `equalSides` checker**

```js
// inside checkers in validator.js, append:

equalSides(segments, opts) {
  if (segments.length === 0) return false;
  // Compute per-side total length using same grouping rule as detectSides
  const sides = [];
  let acc = 0;
  let prev = { dx: segments[0].x2 - segments[0].x1, dy: segments[0].y2 - segments[0].y1 };
  let prevLen = Math.hypot(prev.dx, prev.dy);
  acc = prevLen;
  for (let i = 1; i < segments.length; i++) {
    const cur = { dx: segments[i].x2 - segments[i].x1, dy: segments[i].y2 - segments[i].y1 };
    const curLen = Math.hypot(cur.dx, cur.dy);
    if (angleBetween(prev, cur) > SIDE_ANGLE_TOLERANCE_DEG) {
      sides.push(acc);
      acc = curLen;
    } else {
      acc += curLen;
    }
    prev = cur;
  }
  sides.push(acc);
  if (sides.length === 0) return false;
  const mean = sides.reduce((a, b) => a + b, 0) / sides.length;
  const maxDev = Math.max(...sides.map(s => Math.abs(s - mean) / mean));
  return maxDev <= (opts.maxVarianceRatio ?? 0.15);
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run tests/validator.geometric.test.js
# Expected: 8 passed
```

- [ ] **Step 5: Commit**

```bash
git add -A "9 grade/dessin-blocs/_engine/validator.js" "9 grade/dessin-blocs/tests/validator.geometric.test.js"
git commit -m "feat(dessin-blocs): validator equalSides (TDD)"
```

---

### Task D4: `rotationalSymmetry` + `sectorCoverage`

**Files:**
- Modify: `9 grade/dessin-blocs/tests/validator.geometric.test.js`
- Modify: `9 grade/dessin-blocs/_engine/validator.js`

Implements rosace-specific checks. See Task D3 pattern: append failing test first; add a `rotationalSymmetry(segments, opts)` checker that rotates the path by `360/order` degrees around centroid and computes per-pixel overlap; add a `sectorCoverage(segments, opts)` that bins segments into N angular sectors around centroid and verifies each has at least `minCoverageRatio` length share. Both need ~30 lines.

- [ ] **Step 1: Append tests for both checks (5 cases each)** — generate a rosace fixture (12 pentagons rotated by 30°) and verify pass; verify single-pentagon fails `rotationalSymmetry:12`.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement both checkers in `validator.js`.** Use the `centroid()` and `rotatePoint(p, theta, c)` helpers. Bin segments into 12 sectors using `atan2(y - cy, x - cx)`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): validator rotationalSymmetry + sectorCoverage (TDD)"
```

---

### Task D5: Masked-IoU at 500×500

**Files:**
- Create: `9 grade/dessin-blocs/tests/validator.iou.test.js`
- Modify: `9 grade/dessin-blocs/_engine/validator.js`

- [ ] **Step 1: Failing test**

```js
// tests/validator.iou.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { iouScore } from '../_engine/validator.js';

describe('iouScore', () => {
  it('returns 1.0 for identical paths', () => {
    const a = [{ x1: 100, y1: 100, x2: 200, y2: 100 }];
    expect(iouScore(a, a, { maskSize: 500, dilatePx: 4 })).toBeCloseTo(1.0, 1);
  });

  it('returns ≤ 0.5 for disjoint paths', () => {
    const a = [{ x1: 50, y1: 50, x2: 100, y2: 50 }];
    const b = [{ x1: 400, y1: 400, x2: 450, y2: 400 }];
    expect(iouScore(a, b, { maskSize: 500, dilatePx: 4 })).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `iouScore(student, target, { maskSize, dilatePx })`** in `validator.js` using `OffscreenCanvas` (jsdom-compatible polyfill or use `node-canvas` dev dep). Render both as binary masks; dilate each by `dilatePx` via box-filter pass; compute `intersection.size / union.size`.

  If `OffscreenCanvas` isn't available in jsdom, install `canvas` as devDep and use `createCanvas(500, 500)` instead. Add to `package.json`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): masked-IoU scorer (TDD)"
```

---

### Task D6: Validator orchestrator + hint heuristics

**Files:**
- Modify: `9 grade/dessin-blocs/tests/validator.geometric.test.js`
- Modify: `9 grade/dessin-blocs/_engine/validator.js`

- [ ] **Step 1: Add tests for `validate(studentSegments, exerciseConfig, ctx)`** that returns `{ pass, hint }` after running geometric → IoU pipeline, with French hint strings per failure type:

```js
describe('validate', () => {
  it('returns French hint when path not closed', () => {
    const r = validate([{ x1:0,y1:0,x2:50,y2:0 }], { mode:'lenient', iou:0.7, geometric:[{check:'closed',maxGapPx:5}] }, {});
    expect(r.pass).toBe(false);
    expect(r.hint).toBe("Ta forme n'est pas fermée.");
  });
  // ... 4 more cases for sideCount, equalSides, rotationalSymmetry, IoU
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Add `validate()` export to `validator.js`** that orchestrates: run `runGeometric` first; if pass, render target shape from `targetShape` config, run `iouScore`, compare to threshold; map failures to hints per spec §4.5 table.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): validator orchestrator + French hints (TDD)"
```

---

## Phase E — Iframe bridge

### Task E1: SET_INSTRUCTION_HEIGHT postMessage

**Files:**
- Create: `9 grade/dessin-blocs/tests/iframe-bridge.test.js`
- Create: `9 grade/dessin-blocs/_engine/iframe-bridge.js`

- [ ] **Step 1: Failing test**

```js
// tests/iframe-bridge.test.js
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { reportHeight } from '../_engine/iframe-bridge.js';

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

  it('observes resize and reposts on change', async () => {
    // (use ResizeObserver mock; verify call count > 1 after triggered resize)
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `iframe-bridge.js`:**

```js
// _engine/iframe-bridge.js
export function reportHeight(interactionCode, value) {
  window.parent.postMessage({
    interactionCode,
    type: 'SET_INSTRUCTION_HEIGHT',
    value
  }, '*');
}

export function observeAndReport(interactionCode, element) {
  const send = () => reportHeight(interactionCode, Math.ceil(element.getBoundingClientRect().height));
  send();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(send).observe(element);
  }
  window.addEventListener('load', send);
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): iframe-bridge postMessage contract (TDD)"
```

---

## Phase F — Block builder UI (DOM, manual + light tests)

### Task F1: Block model types

**Files:**
- Create: `9 grade/dessin-blocs/_engine/block-types.js`
- Create: `9 grade/dessin-blocs/tests/block-types.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { BLOCK_TYPES, isValidBlock } from '../_engine/block-types.js';

describe('block types', () => {
  it('declares all 9 types with category + color', () => {
    expect(Object.keys(BLOCK_TYPES).sort()).toEqual([
      'back','divide-360-by','forward','number','pen-down','pen-up',
      'repeat','set-color','turn-left','turn-right'
    ].sort());
    expect(BLOCK_TYPES.forward.category).toBe('mouvement');
    expect(BLOCK_TYPES.forward.color).toBe('#BF5A24');
  });

  it('isValidBlock accepts well-formed forward block', () => {
    expect(isValidBlock({ id:'b1', type:'forward', params:{distance:100} })).toBe(true);
  });

  it('isValidBlock rejects unknown type', () => {
    expect(isValidBlock({ id:'b1', type:'wat', params:{} })).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Write `block-types.js`** declaring all 10 block types (mouvement: forward/back/turn-right/turn-left in rust `#BF5A24`; stylo: pen-up/pen-down/set-color in forest `#1F4D3C`; boucles: repeat in gold `#B8893A`; maths: number/divide-360-by in navy `#1E2A4D`) with French labels, param shapes, and `accepts_children: bool`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): block type registry (TDD)"
```

---

### Task F2: Block DOM rendering

**Files:**
- Create: `9 grade/dessin-blocs/tests/builder.render.test.js`
- Create: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Failing test**

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderBlock } from '../_engine/builder.js';

describe('renderBlock', () => {
  it('renders a forward block with rust color and distance input', () => {
    const el = renderBlock({ id:'b1', type:'forward', params:{distance:100} });
    expect(el.classList.contains('block')).toBe(true);
    expect(el.classList.contains('block--mouvement')).toBe(true);
    expect(el.style.borderColor).toMatch(/BF5A24|#bf5a24/i);
    expect(el.querySelector('input[data-param="distance"]').value).toBe('100');
  });

  it('renders a repeat block with C-shape and child slot', () => {
    const el = renderBlock({ id:'b1', type:'repeat', params:{times:4}, children:[] });
    expect(el.querySelector('.block-children')).toBeTruthy();
  });

  it('uses textContent (not innerHTML) for label', () => {
    const el = renderBlock({ id:'b1', type:'forward', params:{distance:1} });
    const label = el.querySelector('.block-label');
    expect(label.innerHTML).toBe('avancer'); // safe — created via textContent
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `renderBlock(block)`** in `builder.js`. Use `document.createElement` exclusively. Apply CSS class based on category. For `repeat`, create nested `.block-children` div and recursively call `renderBlock` for each child. Inputs use `<input type="number">` with `data-param="<name>"` attribute and `data-block-id="<id>"`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): renderBlock DOM (TDD)"
```

---

### Task F3: Programme rendering (toolbox + drop zones)

**Files:**
- Modify: `9 grade/dessin-blocs/tests/builder.render.test.js`
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Add tests for `renderToolbox(blockTypeIds)` and `renderProgramme(programme)`.** Each test asserts: returns a container with N children for N blocks; toolbox container has `.toolbox` class; programme container has `.programme` class with drop zones (`.drop-zone`) between blocks.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `renderToolbox` (renders read-only blocks with `data-template-type` attr) and `renderProgramme` (renders editable blocks separated by drop-zone divs).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit:**

```bash
git commit -m "feat(dessin-blocs): toolbox + programme rendering with drop zones (TDD)"
```

---

### Task F4: Drag-and-drop (build mode) — manual smoke

**Files:**
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

This is hard to unit-test cleanly with jsdom; verify manually in browser.

- [ ] **Step 1: Implement `attachDragHandlers(programmeEl, toolboxEl, onProgrammeChange)`** in `builder.js`. Use HTML5 drag-and-drop API on desktop (`dragstart`, `dragover`, `drop`) AND Pointer Events for mobile touch (`pointerdown`, `pointermove`, `pointerup`). On drop into a drop-zone or `.block-children`, insert into programme array, call `onProgrammeChange(newProgramme)`.

- [ ] **Step 2: Manual smoke** — write a tiny `tests/manual-drag.html` that loads the builder and lets you drag blocks. Verify on macOS Chrome + iOS Safari (simulator).

- [ ] **Step 3: Commit:**

```bash
git add -A "9 grade/dessin-blocs/"
git commit -m "feat(dessin-blocs): drag-and-drop for build mode (manual smoke)"
```

---

### Task F5: Fill mode — editable slots

**Files:**
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Implement `applyFillMode(programmeEl, editableSlots)`.** Walk programme DOM; for each `[data-block-id][data-param]` input, if its `<id>.<param>` is NOT in `editableSlots`, set `disabled=true` AND `readonly=true`. Editable inputs get a yellow highlight class.

- [ ] **Step 2: Add unit test** — render a programme with `editableSlots: ["b2.distance"]`, assert only that input is enabled.

- [ ] **Step 3: Run, verify pass.**

- [ ] **Step 4: Commit:**

```bash
git commit -m "feat(dessin-blocs): fill mode editable slots (TDD)"
```

---

### Task F6: Step mode — tap-to-execute

**Files:**
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Implement `attachStepMode(toolboxEl, onTap)`.** On tap of a toolbox block, call `onTap({ type, defaultParams })`. Caller appends to programme + executes incrementally.

- [ ] **Step 2: Manual smoke in `tests/manual-step.html`.**

- [ ] **Step 3: Commit:**

```bash
git commit -m "feat(dessin-blocs): step mode tap-to-execute (manual smoke)"
```

---

### Task F7: Student inputs (slider for ex 5)

**Files:**
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Implement `renderStudentInputs(inputsConfig, onChange)`.** Returns a container with `<input type="range">` per integer input + a number readout. Calls `onChange({ id: value })` on input.

- [ ] **Step 2: Unit test** — render `[{ id:'n', type:'integer', min:3, max:8, default:5 }]`, assert range input present with min=3 max=8 value=5.

- [ ] **Step 3: Run, verify pass.**

- [ ] **Step 4: Commit:**

```bash
git commit -m "feat(dessin-blocs): student inputs slider (TDD)"
```

---

## Phase G — Renardo CSS theme

### Task G1: `builder.css` with Renardo palette + responsive layout

**Files:**
- Create: `9 grade/dessin-blocs/_engine/builder.css`

- [ ] **Step 1: Write CSS** (~300 lines) defining:
  - `:root` CSS variables for Renardo palette (rust/forest/navy/gold/paper)
  - `.block` base styles (rounded rect, padding, drop shadow, font-family Inter)
  - `.block--mouvement`, `.block--stylo`, `.block--boucles`, `.block--maths` color variants
  - `.block.repeat` C-shape with `.block-children` indented +20 px
  - `.toolbox` flexbox with horizontal scroll on phone
  - `.programme` vertical stack with `.drop-zone` (8px tall, dashed border on dragover)
  - `.canvas-pane` SVG container with white bg
  - Mobile: `@media (max-width: 600px)` stacks toolbox/programme/canvas vertically; tap targets ≥ 44px
  - `.btn-execute` (large primary action button)
  - `.btn-abort` (visible only during execution)
  - `.feedback-success`, `.feedback-error` (matches existing s3_02 patterns)

- [ ] **Step 2: Manual smoke** — open `tests/manual-render.html` (loads `builder.css` + renders one of each block type). Verify in Chrome + iOS Safari.

- [ ] **Step 3: Commit:**

```bash
git add "9 grade/dessin-blocs/_engine/builder.css"
git commit -m "feat(dessin-blocs): Renardo theme CSS (manual smoke)"
```

---

## Phase H — Engine main entry

### Task H1: `builder.js` orchestrator (loadConfig + render + run)

**Files:**
- Modify: `9 grade/dessin-blocs/_engine/builder.js`

- [ ] **Step 1: Implement `init(rootElement, config)`** that:
  1. Reads `config.mode` ('step' | 'fill' | 'build')
  2. Renders header (config.title), intro_fr, toolbox, programme, canvas, Exécuter/Réinitialiser buttons, abort button (hidden)
  3. If config.studentInputs, renders sliders that update `programme` template variables
  4. Wires Exécuter button to: validate inputs → flatten programme → execute via interpreter → paint via renderer → run validator → show feedback
  5. Wires Réinitialiser to reset to starterProgramme
  6. Calls `iframe-bridge.observeAndReport(config.interactionCode, rootElement)` last

- [ ] **Step 2: Smoke test** — write `tests/manual-init.html` that loads `02-carre.json` (next phase) and verifies the full flow visually.

- [ ] **Step 3: Commit:**

```bash
git commit -m "feat(dessin-blocs): builder.js init orchestrator"
```

---

## Phase I — Exercise configs

### Task I1: Write all 7 JSON configs

**Files:**
- Create: `9 grade/dessin-blocs/exercises/01-decouvrir-tortue.json`
- Create: `9 grade/dessin-blocs/exercises/02-carre.json`
- Create: `9 grade/dessin-blocs/exercises/03-rectangle.json`
- Create: `9 grade/dessin-blocs/exercises/04-triangle.json`
- Create: `9 grade/dessin-blocs/exercises/05-polygones-reguliers.json`
- Create: `9 grade/dessin-blocs/exercises/06-rosace.json`
- Create: `9 grade/dessin-blocs/exercises/07-creation-libre.json`

- [ ] **Step 1: Write all 7 files.** Use the JSON shapes from spec §4.3. Each must have `id`, `title`, `interactionCode` (`BD_1`...`BD_7`), `intro_fr`, `mode`, `toolbox`, `validation`, `targetShape`. Configs 02-05 also need `starterProgramme` and `editableSlots`. Config 05 needs `studentInputs`. Config 06-07 use `mode:"build"`.

- [ ] **Step 2: Add a JSON-validity test:**

```js
// tests/exercise-configs.test.js
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const dir = new URL('../exercises/', import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith('.json'));

describe('exercise configs', () => {
  it('has exactly 7 configs', () => {
    expect(files).toHaveLength(7);
  });

  it.each(files)('%s is valid JSON with required fields', (f) => {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    expect(c.id).toBeTruthy();
    expect(c.interactionCode).toMatch(/^BD_\d+$/);
    expect(['step','fill','build']).toContain(c.mode);
    expect(c.validation).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run, verify all 7 pass.**

- [ ] **Step 4: Commit:**

```bash
git add "9 grade/dessin-blocs/exercises/" "9 grade/dessin-blocs/tests/exercise-configs.test.js"
git commit -m "feat(dessin-blocs): 7 exercise JSON configs"
```

---

## Phase J — Wrapper generator

### Task J1: `stamp-wrappers.mjs` (TDD)

**Files:**
- Create: `9 grade/dessin-blocs/_engine/exercise-shell.html`
- Create: `9 grade/dessin-blocs/_build/stamp-wrappers.mjs`
- Create: `9 grade/dessin-blocs/tests/stamp-wrappers.test.js`

- [ ] **Step 1: Write `exercise-shell.html` template:**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
<link rel="stylesheet" href="./_engine/fonts.css">
<link rel="stylesheet" href="./_engine/builder.css">
</head>
<body>
<div id="app"></div>
<script>window.DESSIN_BLOCS_EXERCISE = "{{EXERCISE_ID}}";</script>
<script type="module" src="./_engine/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write failing test for `stampWrappers()`:**

```js
// tests/stamp-wrappers.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { stampWrappers } from '../_build/stamp-wrappers.mjs';

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'stamp-'));
  mkdirSync(join(tmp, 'exercises'));
  mkdirSync(join(tmp, '_engine'));
  writeFileSync(join(tmp, '_engine/exercise-shell.html'), '<title>{{TITLE}}</title><script>window.DESSIN_BLOCS_EXERCISE="{{EXERCISE_ID}}";</script>');
  writeFileSync(join(tmp, 'exercises/02-carre.json'), JSON.stringify({
    id: '02-carre', title: 'Carré', interactionCode: 'BD_2', mode: 'fill', validation: {}, intro_fr: '', toolbox: [], targetShape: null
  }));
});

describe('stampWrappers', () => {
  it('stamps one HTML wrapper per JSON config', async () => {
    await stampWrappers({ root: tmp });
    expect(existsSync(join(tmp, '02-carre.html'))).toBe(true);
    const html = readFileSync(join(tmp, '02-carre.html'), 'utf8');
    expect(html).toContain('Carré');
    expect(html).toContain('"02-carre"');
  });

  it('emits embed-manifest.json', async () => {
    await stampWrappers({ root: tmp });
    const m = JSON.parse(readFileSync(join(tmp, '_build/embed-manifest.json'), 'utf8'));
    expect(m).toHaveLength(1);
    expect(m[0].interactionCode).toBe('BD_2');
    expect(m[0].iframeUrl).toMatch(/02-carre\.html$/);
    expect(m[0].iframeHtml).toContain('<iframe');
  });

  it('emits index-dessin.html with links to all wrappers', async () => {
    await stampWrappers({ root: tmp });
    const idx = readFileSync(join(tmp, 'index-dessin.html'), 'utf8');
    expect(idx).toContain('02-carre.html');
  });

  it('throws on duplicate IDs', async () => {
    writeFileSync(join(tmp, 'exercises/02-carre-dup.json'), JSON.stringify({
      id: '02-carre', title: 'Dup', interactionCode: 'BD_2', mode: 'fill', validation: {}, intro_fr: '', toolbox: [], targetShape: null
    }));
    await expect(stampWrappers({ root: tmp })).rejects.toThrow(/duplicate/i);
  });

  it('throws on malformed interactionCode', async () => {
    writeFileSync(join(tmp, 'exercises/03-bad.json'), JSON.stringify({
      id: '03-bad', title: 'Bad', interactionCode: 'NOT_VALID', mode: 'fill', validation: {}, intro_fr: '', toolbox: [], targetShape: null
    }));
    await expect(stampWrappers({ root: tmp })).rejects.toThrow(/interactionCode/i);
  });
});
```

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Implement `stamp-wrappers.mjs`:**

```js
// _build/stamp-wrappers.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs';
const INTERACTION_CODE_RE = /^BD_\d+$/;

export async function stampWrappers({ root } = {}) {
  root = root || dirname(fileURLToPath(import.meta.url)) + '/..';
  const exercises = readdirSync(join(root, 'exercises'))
    .filter(f => f.endsWith('.json'))
    .map(f => ({ file: f, ...JSON.parse(readFileSync(join(root, 'exercises', f), 'utf8')) }));

  const seenIds = new Set();
  for (const ex of exercises) {
    if (seenIds.has(ex.id)) throw new Error(`Duplicate id: ${ex.id}`);
    seenIds.add(ex.id);
    if (!INTERACTION_CODE_RE.test(ex.interactionCode)) {
      throw new Error(`Malformed interactionCode: ${ex.interactionCode}`);
    }
  }

  const template = readFileSync(join(root, '_engine', 'exercise-shell.html'), 'utf8');
  const manifest = [];

  for (const ex of exercises) {
    const wrapperName = ex.file.replace(/\.json$/, '.html');
    const html = template
      .replaceAll('{{TITLE}}', ex.title)
      .replaceAll('{{EXERCISE_ID}}', ex.id);
    writeFileSync(join(root, wrapperName), html);

    const url = `${BASE_URL}/${wrapperName}`;
    const iframeHtml = `<iframe src="${url}" width="100%" frameborder="0" scrolling="no" style="border:0;display:block;width:100%;" allow="fullscreen"></iframe>`;
    manifest.push({ id: ex.interactionCode, title: ex.title, iframeUrl: url, interactionCode: ex.interactionCode, iframeHtml });
  }

  // Index page
  const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Dessin par Blocs</title><link rel="stylesheet" href="./_engine/builder.css"></head>
<body><h1>Dessin par Blocs</h1><ul>${exercises.map(ex => `<li><a href="./${ex.file.replace(/\.json$/, '.html')}">${ex.title}</a></li>`).join('')}</ul></body></html>`;
  writeFileSync(join(root, 'index-dessin.html'), indexHtml);

  mkdirSync(join(root, '_build'), { recursive: true });
  writeFileSync(join(root, '_build', 'embed-manifest.json'), JSON.stringify(manifest, null, 2));

  return { wrappers: exercises.length, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  stampWrappers().then(r => console.log(`Stamped ${r.wrappers} wrappers`));
}
```

- [ ] **Step 5: Run, verify all 5 tests pass.**

- [ ] **Step 6: Commit:**

```bash
git add "9 grade/dessin-blocs/_build/" "9 grade/dessin-blocs/_engine/exercise-shell.html" "9 grade/dessin-blocs/tests/stamp-wrappers.test.js"
git commit -m "feat(dessin-blocs): wrapper generator with manifest output (TDD)"
```

---

### Task J2: Engine main entry point + run generator

**Files:**
- Create: `9 grade/dessin-blocs/_engine/main.js`

- [ ] **Step 1: Write `main.js`** that imports `init` from `builder.js`, fetches the JSON config matching `window.DESSIN_BLOCS_EXERCISE`, and calls `init(document.getElementById('app'), config)`.

```js
// _engine/main.js
import { init } from './builder.js';

const exerciseId = window.DESSIN_BLOCS_EXERCISE;
if (!exerciseId) throw new Error('DESSIN_BLOCS_EXERCISE not set');

const res = await fetch(`./exercises/${exerciseId}.json`);
if (!res.ok) throw new Error(`Cannot load exercise: ${exerciseId}`);
const config = await res.json();

init(document.getElementById('app'), config);
```

- [ ] **Step 2: Run the stamper for real:**

```bash
cd "9 grade/dessin-blocs"
npm run stamp
ls *.html         # should list 7 wrappers + index-dessin.html
cat _build/embed-manifest.json | head -30
```

- [ ] **Step 3: Commit generated wrappers + manifest + main.js:**

```bash
git add -A "9 grade/dessin-blocs/"
git commit -m "feat(dessin-blocs): main.js + 7 stamped wrappers + index + manifest"
```

---

## Phase K — Smoke test + push

### Task K1: Local smoke test on all 7 exercises

**Files:** none modified.

- [ ] **Step 1: Start a local static server:**

```bash
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
python3 -m http.server 8000
# In browser: http://localhost:8000/9%20grade/dessin-blocs/index-dessin.html
```

- [ ] **Step 2: Click each of 7 exercises, verify:**
  - Page loads with no console errors
  - Toolbox + programme + canvas all visible
  - For ex 2 carré: fill in distance=100, angle=90, click Exécuter → square draws → "Bravo!" feedback
  - For ex 5 polygones: slider works; entering wrong angle → wrong shape draws → hint shown
  - For ex 6 rosace: build mode allows dragging blocks
  - For ex 7 libre: full toolbox available; PNG save works

- [ ] **Step 3: If any exercise fails, fix in builder.js / config / CSS, re-stamp, re-test.**

- [ ] **Step 4: Mobile smoke** — test on iPhone (Safari) and iPad. Specific checks: tap targets ≥ 44px, no horizontal scroll, drag-and-drop works with touch.

- [ ] **Step 5: Commit any fixes:**

```bash
git commit -m "fix(dessin-blocs): smoke-test fixes from local + mobile"
```

---

### Task K2: Push to `main` and verify GitHub Pages deploy

**Files:** none.

- [ ] **Step 1: Push:**

```bash
cd "/Users/ackleylitsios/Documents/GitHub/Games for MiniCourse"
git push origin main
```

- [ ] **Step 2: Wait 1-2 minutes for GitHub Pages auto-build, then verify URLs:**

```bash
for n in 01-decouvrir-tortue 02-carre 03-rectangle 04-triangle 05-polygones-reguliers 06-rosace 07-creation-libre; do
  url="https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/${n}.html"
  echo -n "$n: "
  curl -s -o /dev/null -w "%{http_code}\n" "$url"
done
# Expected: all 200
```

- [ ] **Step 3: Open `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/index-dessin.html` in iPhone Safari + Android Chrome (BrowserStack OK if no devices). Confirm at least exercise 2 (carré) works end-to-end on each.**

---

### Task K3: RepoPrompt code review on engine

**Files:** none.

- [ ] **Step 1: From the orchestrator thread, run:**

```
oracle_send mode=review new_chat=true
"Review the dessin-blocs engine code for correctness, mobile robustness, and accessibility regressions. Files: 9 grade/dessin-blocs/_engine/*.js, _engine/builder.css, _build/stamp-wrappers.mjs, exercises/*.json. Grade findings P0/P1/P2."
```

- [ ] **Step 2: Address P0 findings (block release). Defer P1/P2 to follow-up if not urgent.**

- [ ] **Step 3: Commit fixes:**

```bash
git commit -m "fix(dessin-blocs): address oracle code review findings"
git push origin main
```

---

## Phase L — Hand off to Plan 2 (theory content)

### Task L1: Publish embed-manifest signal for L3b

**Files:** none.

- [ ] **Step 1: Confirm `_build/embed-manifest.json` is committed and contains 7 entries with live `iframeUrl`s.**

- [ ] **Step 2: Open Plan 2 (`docs/superpowers/plans/2026-05-08-dessin-blocs-theory.md`) — to be written next.** Plan 2 covers:
  - Spawn Atelier recruit, brief L3a → 14 markdown files (7 COURS + 7 PROMPTS) parallel with this work
  - After L1 push complete, brief L3b → 7 BUILDER.md using embed-manifest.json
  - Optional L4 Gemini cross-review of French content
  - Run MiniCourse generator to produce 7 PDFs in PDF_Eleves/

- [ ] **Step 3: Mark this plan complete:**

```bash
# Update task tracking — Plan 1 done.
```

---

## Self-review notes

Spec coverage:
- §3 (7 exercises with mode mapping): Phase I.
- §4.1 (engine layout): Phases B, C, D, E, F, G, H.
- §4.2 (block model): Task F1.
- §4.3 (per-exercise modes): Tasks F4-F7.
- §4.4 (interpreter): Phase B.
- §4.5 (validator): Phase D.
- §4.6 (iframe contract): Phase E.
- §4.7 (wrapper script): Task J2.
- §4.8 (stamp-wrappers contract): Task J1.
- §4.9 (embed manifest): Task J1, L1.
- §5.1 (file layout): Task A1.
- §5.4 (vendored fonts): Task A2.
- §6.1 L1 lane: this entire plan.
- §6.2 L3 lanes: handed to Plan 2.
- §7 risks: mitigations distributed across tasks (interpreter bounds in B, validator tolerances in D, postMessage in E, font vendoring in A2, etc.).
- §8 gating: K1 (local), K2 (push + URLs), K3 (rp-review).

Open question (deferred to Plan 2): MiniCourse generator invocation + 5-student dry run owner.

No placeholders found in plan steps. Type names consistent (`runGeometric`, `validate`, `iouScore`, `stampWrappers`, `init`, `paintSvg`, `flatten`, `execute`).
