export const MAX_COMMANDS = 5000;
export const MAX_LOOP_DEPTH = 4;
export const MAX_REPEAT_TIMES = 1000;

// Explicit integer clamp. The previous `n | 0` coercion wrapped at 2^31
// for huge inputs (5_000_000_000 | 0 === 705032704), and silently floored
// negative / NaN to 0 without telling the caller.
export function clampRepeatTimes(times) {
  const n = Math.floor(Number(times));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_REPEAT_TIMES, n));
}

export function flatten(programme, depth = 0) {
  if (depth > MAX_LOOP_DEPTH) {
    throw new Error(`Loop depth exceeds MAX_LOOP_DEPTH (${MAX_LOOP_DEPTH})`);
  }
  const out = [];
  for (const block of programme) {
    if (block.type === 'repeat') {
      const times = clampRepeatTimes(block.params.times);
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
    await new Promise(r => typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(r) : setTimeout(r, 0));
  }
}
