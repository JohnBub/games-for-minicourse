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
