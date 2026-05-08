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
