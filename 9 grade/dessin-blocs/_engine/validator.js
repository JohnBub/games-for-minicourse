// _engine/validator.js

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

function centroid(segments) {
  if (segments.length === 0) return { cx: 0, cy: 0 };
  let sx = 0, sy = 0, n = 0;
  for (const s of segments) {
    sx += s.x1 + s.x2;
    sy += s.y1 + s.y2;
    n += 2;
  }
  return { cx: sx / n, cy: sy / n };
}

function rotatePoint(x, y, theta, cx, cy) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const dx = x - cx, dy = y - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

function pathSetHash(segments, cellSize = 6) {
  // Quantize endpoints into a grid; return a Set of "x,y" cell strings covered
  const set = new Set();
  for (const s of segments) {
    const cells = bresenhamCells(s.x1, s.y1, s.x2, s.y2, cellSize);
    for (const c of cells) set.add(c);
  }
  return set;
}

function bresenhamCells(x0, y0, x1, y1, cellSize) {
  // Sample along the segment at cellSize/2 spacing, quantize each sample to a cell
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / (cellSize / 2)));
  const cells = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t, y = y0 + dy * t;
    cells.add(`${Math.round(x / cellSize)},${Math.round(y / cellSize)}`);
  }
  return cells;
}

function intersectionRatio(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const k of a) if (b.has(k)) common++;
  return common / Math.min(a.size, b.size);
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
  },
  equalSides(segments, opts) {
    if (segments.length === 0) return false;
    // Compute per-side total length using the same grouping rule as detectSides.
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
  },
  rotationalSymmetry(segments, opts) {
    const order = opts.order;
    if (!order || order < 2 || segments.length === 0) return false;
    const { cx, cy } = centroid(segments);
    const original = pathSetHash(segments);
    const theta = (2 * Math.PI) / order;
    // Rotate path by theta and compare cell sets
    const rotated = segments.map(s => {
      const a = rotatePoint(s.x1, s.y1, theta, cx, cy);
      const b = rotatePoint(s.x2, s.y2, theta, cx, cy);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    });
    const rotatedSet = pathSetHash(rotated);
    const ratio = intersectionRatio(original, rotatedSet);
    return ratio >= 0.7;  // 70% cell overlap = symmetric (tolerance includes angleToleranceDeg implicitly via cellSize)
  },
  sectorCoverage(segments, opts) {
    const sectors = opts.sectors;
    const minRatio = opts.minCoverageRatio ?? 0.3;
    if (!sectors || sectors < 2 || segments.length === 0) return false;
    const { cx, cy } = centroid(segments);
    const sectorLengths = new Array(sectors).fill(0);
    let totalLen = 0;
    for (const s of segments) {
      // Use midpoint angle for each segment
      const mx = (s.x1 + s.x2) / 2;
      const my = (s.y1 + s.y2) / 2;
      let angle = Math.atan2(my - cy, mx - cx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      const idx = Math.min(sectors - 1, Math.floor(angle / (360 / sectors)));
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      sectorLengths[idx] += len;
      totalLen += len;
    }
    if (totalLen === 0) return false;
    const expectedPerSector = totalLen / sectors;
    return sectorLengths.every(l => l >= expectedPerSector * minRatio);
  },
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

function rasterizeSegments(segments, maskSize) {
  // Pure-JS Bresenham. Returns Uint8Array of length maskSize*maskSize, 1 where stroked.
  const mask = new Uint8Array(maskSize * maskSize);
  for (const s of segments) {
    let x0 = Math.round(s.x1), y0 = Math.round(s.y1);
    const x1 = Math.round(s.x2), y1 = Math.round(s.y2);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x0 >= 0 && x0 < maskSize && y0 >= 0 && y0 < maskSize) {
        mask[y0 * maskSize + x0] = 1;
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 <  dx) { err += dx; y0 += sy; }
    }
  }
  return mask;
}

function dilateMask(mask, maskSize, px) {
  // Square dilation by px pixels (3x3 box filter applied px times).
  let cur = mask;
  for (let pass = 0; pass < px; pass++) {
    const next = new Uint8Array(maskSize * maskSize);
    for (let y = 0; y < maskSize; y++) {
      for (let x = 0; x < maskSize; x++) {
        if (cur[y * maskSize + x]) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < maskSize && ny >= 0 && ny < maskSize) {
                next[ny * maskSize + nx] = 1;
              }
            }
          }
        }
      }
    }
    cur = next;
  }
  return cur;
}

export function iouScore(studentSegments, targetSegments, { maskSize = 500, dilatePx = 4 } = {}) {
  if (studentSegments.length === 0) return 0;
  if (targetSegments.length === 0) return 0;
  const sMask = dilateMask(rasterizeSegments(studentSegments, maskSize), maskSize, dilatePx);
  const tMask = dilateMask(rasterizeSegments(targetSegments, maskSize), maskSize, dilatePx);
  let inter = 0, union = 0;
  for (let i = 0; i < sMask.length; i++) {
    const s = sMask[i], t = tMask[i];
    if (s || t) union++;
    if (s && t) inter++;
  }
  return union === 0 ? 0 : inter / union;
}
