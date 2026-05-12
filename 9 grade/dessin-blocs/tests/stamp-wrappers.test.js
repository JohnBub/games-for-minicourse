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
  writeFileSync(join(tmp, '_engine/exercise-shell.html'),
    '<title>{{TITLE}}</title><script>window.DESSIN_BLOCS_EXERCISE="{{EXERCISE_ID}}";</script>');
  writeFileSync(join(tmp, 'exercises/02-carre.json'), JSON.stringify({
    id: '02-carre', title: 'Carré', interactionCode: 'BD_2',
    mode: 'fill', validation: {}, intro_fr: 'Trace un carré.',
    toolbox: [], targetShape: null
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
    expect(idx).toContain('Carré');
  });

  it('throws on duplicate IDs', async () => {
    writeFileSync(join(tmp, 'exercises/02-carre-dup.json'), JSON.stringify({
      id: '02-carre', title: 'Dup', interactionCode: 'BD_2',
      mode: 'fill', validation: {}, intro_fr: '', toolbox: [], targetShape: null
    }));
    await expect(stampWrappers({ root: tmp })).rejects.toThrow(/duplicate/i);
  });

  it('throws on malformed interactionCode', async () => {
    writeFileSync(join(tmp, 'exercises/03-bad.json'), JSON.stringify({
      id: '03-bad', title: 'Bad', interactionCode: 'NOT_VALID',
      mode: 'fill', validation: {}, intro_fr: '', toolbox: [], targetShape: null
    }));
    await expect(stampWrappers({ root: tmp })).rejects.toThrow(/interactionCode/i);
  });
});
