// tests/exercise-integration.test.js
// End-to-end test per exercise: canonical solution → flatten → Turtle.run →
// validate must return pass: true. Closes the test gap that let P0-2
// (rectangle/square mismatch) and P0-3 (number block in build toolbox) slip
// past the unit tests.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { flatten } from '../_engine/interpreter.js';
import { Turtle } from '../_engine/renderer.js';
import { validate } from '../_engine/validator.js';
import { BLOCK_TYPES } from '../_engine/block-types.js';
import { computeTurtleStart, resolveProgramme, seedDefaults, setBlockParam } from '../_engine/builder.js';

const here = dirname(fileURLToPath(import.meta.url));
const exercisesDir = join(here, '..', 'exercises');

function loadConfig(filename) {
  return JSON.parse(readFileSync(join(exercisesDir, filename), 'utf8'));
}

// Runs the canonical solution synchronously against a Turtle and returns
// its segment list + a validator verdict.
function runSolution(config, programme, studentState = {}) {
  const seeded = seedDefaults(programme);
  const resolved = resolveProgramme(seeded, studentState);
  const commands = flatten(resolved);
  const start = computeTurtleStart(config, studentState) || {};
  const turtle = new Turtle({ width: 500, height: 500, ...start });
  for (const cmd of commands) turtle.run(cmd);
  const verdict = validate(turtle.segments, config, { studentInputs: studentState });
  return { turtle, verdict };
}

describe('exercise integration — canonical solutions pass validation', () => {
  it('ex 1 — découvrir la tortue (no validation, anything passes)', () => {
    const config = loadConfig('01-decouvrir-tortue.json');
    const programme = [
      { id: 'a', type: 'forward', params: { distance: 100 } },
      { id: 'b', type: 'turn-right', params: { angle: 90 } }
    ];
    expect(runSolution(config, programme).verdict.pass).toBe(true);
  });

  it('ex 2 — carré (distance 200, angle 90)', () => {
    const config = loadConfig('02-carre.json');
    // Mutate the editable slots b2.distance and b3.angle to the correct values.
    let programme = config.starterProgramme;
    programme = setBlockParam(programme, 'b2', 'distance', 200);
    programme = setBlockParam(programme, 'b3', 'angle', 90);
    expect(runSolution(config, programme).verdict).toMatchObject({ pass: true });
  });

  it('ex 3 — rectangle (220 × 140)', () => {
    const config = loadConfig('03-rectangle.json');
    let programme = config.starterProgramme;
    programme = setBlockParam(programme, 'b2', 'distance', 220);
    programme = setBlockParam(programme, 'b4', 'distance', 140);
    expect(runSolution(config, programme).verdict).toMatchObject({ pass: true });
  });

  it('ex 4 — triangle équilatéral (angle 120 — exterior, not interior 60)', () => {
    const config = loadConfig('04-triangle.json');
    let programme = config.starterProgramme;
    programme = setBlockParam(programme, 'b3', 'angle', 120);
    expect(runSolution(config, programme).verdict).toMatchObject({ pass: true });
  });

  it('ex 5 — polygones réguliers (angle = 360/N for several N)', () => {
    const config = loadConfig('05-polygones-reguliers.json');
    for (const n of [3, 4, 5, 6, 8]) {
      let programme = config.starterProgramme;
      programme = setBlockParam(programme, 'b3', 'angle', 360 / n);
      const { verdict } = runSolution(config, programme, { n });
      expect(verdict.pass, `N=${n}: ${verdict.hint}`).toBe(true);
    }
  });

  it('ex 6 — rosace (12 petals × 5-sided polygon)', () => {
    const config = loadConfig('06-rosace.json');
    // Canonical: outer répéter 12 { inner répéter 5 { forward 60, turn-right 72 } turn-right 30 }
    const programme = [{
      id: 'b1', type: 'repeat', params: { times: 12 },
      children: [
        { id: 'b2', type: 'repeat', params: { times: 5 }, children: [
          { id: 'b3', type: 'forward', params: { distance: 60 } },
          { id: 'b4', type: 'turn-right', params: { angle: 72 } }
        ]},
        { id: 'b5', type: 'turn-right', params: { angle: 30 } }
      ]
    }];
    const { verdict } = runSolution(config, programme);
    expect(verdict.pass, verdict.hint || 'unexpected fail').toBe(true);
  });

  it('ex 7 — création libre (no validation, any drawing passes)', () => {
    const config = loadConfig('07-creation-libre.json');
    const programme = [
      { id: 'a', type: 'forward', params: { distance: 80 } },
      { id: 'b', type: 'turn-right', params: { angle: 144 } }
    ];
    expect(runSolution(config, programme).verdict.pass).toBe(true);
  });
});

describe('build-mode toolboxes are fully executable', () => {
  // The control-structure types are valid in the programme tree but are
  // unfolded by flatten() into other commands. Everything else must be a
  // command Turtle.run() actually accepts.
  const CONTROL_TYPES = new Set(['repeat']);
  const VALUE_TYPES = new Set(['number']);

  const buildConfigs = ['06-rosace.json', '07-creation-libre.json'].map(loadConfig);

  it.each(buildConfigs)('$id toolbox has no orphan value blocks', (config) => {
    for (const blockType of config.toolbox) {
      expect(BLOCK_TYPES[blockType], `unknown block type "${blockType}"`).toBeTruthy();
      // A value block in a statement position throws "Unknown command:
      // <type>" at run-time — the same class as P0-3.
      expect(VALUE_TYPES.has(blockType), `value block "${blockType}" must not appear in a build toolbox until expression sockets exist`).toBe(false);
    }
  });

  it.each(buildConfigs)('$id toolbox blocks are all executable or control', (config) => {
    const turtle = new Turtle({ width: 500, height: 500 });
    for (const blockType of config.toolbox) {
      if (CONTROL_TYPES.has(blockType)) continue;
      const def = BLOCK_TYPES[blockType];
      const params = {};
      for (const [name, spec] of Object.entries(def.params)) {
        if (spec.default !== undefined) params[name] = spec.default;
      }
      expect(() => turtle.run({ type: blockType, params }))
        .not.toThrow();
    }
  });
});
