import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'exercises');
const files = readdirSync(dir).filter(f => f.endsWith('.json'));

describe('exercise configs', () => {
  it('has exactly 7 configs', () => {
    expect(files).toHaveLength(7);
  });

  it.each(files)('%s is valid JSON with required fields', (f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    const c = JSON.parse(raw);
    expect(c.id).toBeTruthy();
    expect(c.interactionCode).toMatch(/^BD_\d+$/);
    expect(['step','fill','build']).toContain(c.mode);
    expect(c.title).toBeTruthy();
    expect(c.intro_fr).toBeTruthy();
    expect(c.validation).toBeTruthy();
    // validation.mode is optional; only 'none' has special meaning (skip).
    // Any other value (or omitted entirely) means full validation runs.
    if (c.validation.mode !== undefined) {
      expect(['none']).toContain(c.validation.mode);
    }
    expect(Array.isArray(c.toolbox)).toBe(true);
  });

  it('all interactionCodes are unique', () => {
    const codes = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')).interactionCode);
    expect(new Set(codes).size).toBe(7);
  });

  it('all ids are unique', () => {
    const ids = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')).id);
    expect(new Set(ids).size).toBe(7);
  });

  it('configs in fill mode have starterProgramme + editableSlots', () => {
    for (const f of files) {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (c.mode === 'fill') {
        expect(Array.isArray(c.starterProgramme)).toBe(true);
        expect(c.starterProgramme.length).toBeGreaterThan(0);
        expect(Array.isArray(c.editableSlots)).toBe(true);
      }
    }
  });
});
