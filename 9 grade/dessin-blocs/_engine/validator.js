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
