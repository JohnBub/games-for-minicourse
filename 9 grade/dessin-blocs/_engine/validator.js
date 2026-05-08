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
