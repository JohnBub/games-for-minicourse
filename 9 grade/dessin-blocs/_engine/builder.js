// _engine/builder.js

import { BLOCK_TYPES, isValidBlock } from './block-types.js';
import { flatten } from './interpreter.js';
import { Turtle, paintTurtle, animate } from './renderer.js';
import { validate, renderTargetShape } from './validator.js';
import { observeAndReport } from './iframe-bridge.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderBlock(block) {
  const def = BLOCK_TYPES[block.type];
  if (!def) throw new Error(`Unknown block type: ${block.type}`);

  const el = document.createElement('div');
  el.classList.add('block');
  el.classList.add(`block--${def.category}`);
  el.dataset.blockId = block.id;
  el.dataset.blockType = block.type;
  el.style.borderColor = def.color;

  // Header row: label + inline param inputs
  const header = document.createElement('div');
  header.classList.add('block-header');

  const label = document.createElement('span');
  label.classList.add('block-label');
  label.textContent = def.label;
  header.appendChild(label);

  for (const [paramName, paramSpec] of Object.entries(def.params)) {
    const input = document.createElement('input');
    input.classList.add('block-input');
    input.dataset.param = paramName;
    input.dataset.blockId = block.id;
    if (paramSpec.type === 'color') {
      input.type = 'color';
    } else {
      input.type = 'number';
    }
    const value = block.params?.[paramName];
    input.value = value !== undefined && value !== null ? String(value) : String(paramSpec.default ?? '');
    header.appendChild(input);

    if (paramSpec.suffix) {
      const suffix = document.createElement('span');
      suffix.classList.add('block-suffix');
      suffix.textContent = paramSpec.suffix;
      header.appendChild(suffix);
    }
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.classList.add('block-delete');
  del.dataset.deleteBlockId = block.id;
  del.setAttribute('aria-label', 'Supprimer ce bloc');
  del.textContent = '×';
  header.appendChild(del);

  el.appendChild(header);

  // Children slot for repeat-style blocks
  if (def.accepts_children) {
    const slot = document.createElement('div');
    slot.classList.add('block-children');
    slot.dataset.parentId = block.id;
    for (const child of (block.children || [])) {
      slot.appendChild(renderBlock(child));
    }
    el.appendChild(slot);
  }

  return el;
}

export function renderToolbox(blockTypeIds) {
  const tb = document.createElement('div');
  tb.classList.add('toolbox');
  for (const typeId of blockTypeIds) {
    const def = BLOCK_TYPES[typeId];
    if (!def) throw new Error(`Unknown block type: ${typeId}`);
    const item = document.createElement('div');
    item.classList.add('toolbox-block');
    item.classList.add(`block--${def.category}`);
    item.dataset.templateType = typeId;
    item.style.borderColor = def.color;
    const label = document.createElement('span');
    label.classList.add('block-label');
    label.textContent = def.label;
    item.appendChild(label);
    tb.appendChild(item);
  }
  return tb;
}

function dropZone(insertIndex, parentId = null) {
  const z = document.createElement('div');
  z.classList.add('drop-zone');
  z.dataset.insertIndex = String(insertIndex);
  if (parentId) z.dataset.parentId = parentId;
  return z;
}

export function renderProgramme(programme) {
  const p = document.createElement('div');
  p.classList.add('programme');

  // Drop zone before first block
  p.appendChild(dropZone(0));

  programme.forEach((block, i) => {
    const blockEl = renderBlock(block);

    // For repeat blocks, augment .block-children with internal drop zones
    if (BLOCK_TYPES[block.type]?.accepts_children) {
      const slot = blockEl.querySelector('.block-children');
      if (slot) {
        // Clear and rebuild with drop zones interspersed
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        const children = block.children || [];
        slot.appendChild(dropZone(0, block.id));
        children.forEach((child, j) => {
          slot.appendChild(renderBlock(child));
          slot.appendChild(dropZone(j + 1, block.id));
        });
      }
    }

    p.appendChild(blockEl);
    p.appendChild(dropZone(i + 1));
  });

  return p;
}

// Returns a NEW programme with the block inserted (does not mutate input).
export function insertBlock(programme, dropTarget, newBlock) {
  if (!isValidBlock(newBlock)) {
    throw new Error(`Invalid block: ${JSON.stringify(newBlock)}`);
  }
  const insertIndex = dropTarget.insertIndex | 0;
  const parentId = dropTarget.parentId || null;

  function recur(list, currentParentId) {
    const out = [];
    if (currentParentId === parentId) {
      // Insert at insertIndex within this list
      for (let i = 0; i < list.length; i++) {
        if (i === insertIndex) out.push(newBlock);
        const item = list[i];
        out.push(BLOCK_TYPES[item.type]?.accepts_children
          ? { ...item, children: recur(item.children || [], item.id) }
          : { ...item });
      }
      if (insertIndex >= list.length) out.push(newBlock);
    } else {
      for (const item of list) {
        out.push(BLOCK_TYPES[item.type]?.accepts_children
          ? { ...item, children: recur(item.children || [], item.id) }
          : { ...item });
      }
    }
    return out;
  }

  return recur(programme, null);
}

export function removeBlock(programme, blockId) {
  function recur(list) {
    const out = [];
    for (const item of list) {
      if (item.id === blockId) continue;
      if (BLOCK_TYPES[item.type]?.accepts_children) {
        out.push({ ...item, children: recur(item.children || []) });
      } else {
        out.push({ ...item });
      }
    }
    return out;
  }
  return recur(programme);
}

let nextBlockId = 1;
function generateBlockId() {
  return `b${nextBlockId++}`;
}

function defaultParamsFor(typeId) {
  const def = BLOCK_TYPES[typeId];
  const params = {};
  for (const [name, spec] of Object.entries(def.params)) {
    if (spec.default !== undefined) params[name] = spec.default;
  }
  return params;
}

// Compute where the turtle should start so its first move traces the
// FIRST edge of the target ghost shape. Without this the turtle starts
// at canvas center and the student's correct trace ends up offset from
// the ghost. Returns null if no target (free-creation / step modes).
export function computeTurtleStart(config, studentState) {
  if (config.startState) return config.startState;
  if (!config.targetShape) return null;
  const shape = { ...config.targetShape };
  if (typeof shape.sidesFrom === 'string') {
    const key = shape.sidesFrom.split('.')[1];
    if (studentState && studentState[key] !== undefined) shape.sides = studentState[key];
  }
  if (!shape.sides && shape.kind === 'regularPolygon') return null;
  const segs = renderTargetShape(shape);
  if (!segs || segs.length === 0) return null;
  const first = segs[0];
  const dx = first.x2 - first.x1;
  const dy = first.y2 - first.y1;
  // Our convention: heading 0 = up (-Y). Math.atan2(dy, dx) gives the
  // standard CCW angle from +X. Convert: heading = atan2 + 90°.
  const heading = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
  return { x: first.x1, y: first.y1, heading };
}

// Walks a programme tree and returns the distinct block.type values in
// order of first appearance. Used to auto-populate the fill-mode toolbox
// so students see what blocks exist in their pre-built programme as a
// non-draggable reference key (the vocabulary of the exercise).
export function collectBlockTypes(programme) {
  const seen = [];
  function walk(list) {
    for (const b of list) {
      if (!seen.includes(b.type)) seen.push(b.type);
      if (b.children) walk(b.children);
    }
  }
  walk(programme || []);
  return seen;
}

// Recursively replace any null/undefined param with that param's default
// from BLOCK_TYPES, so a starterProgramme with `"distance": null`
// (the editable slot pattern) loads with a working value matching the UI.
export function seedDefaults(programme) {
  function recur(list) {
    return list.map(b => {
      const def = BLOCK_TYPES[b.type];
      const params = { ...(b.params || {}) };
      if (def && def.params) {
        for (const [name, spec] of Object.entries(def.params)) {
          if (params[name] === null || params[name] === undefined) {
            if (spec.default !== undefined) params[name] = spec.default;
          }
        }
      }
      const out = { ...b, params };
      if (b.children) out.children = recur(b.children);
      return out;
    });
  }
  return recur(programme);
}

// Wires drag-from-toolbox + drop-into-programme.
// onChange receives the new programme array after each insert.
// Both desktop HTML5 DnD and mobile Pointer Events are handled.
export function attachDragHandlers(programmeEl, toolboxEl, getProgramme, onChange) {
  if (!programmeEl || !toolboxEl) return;

  // ── Desktop HTML5 drag-and-drop ───────────────────────────────────────────
  toolboxEl.querySelectorAll('.toolbox-block').forEach(item => {
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/x-block-type', item.dataset.templateType);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  programmeEl.addEventListener('dragover', (e) => {
    const z = e.target.closest('.drop-zone');
    if (z) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      z.classList.add('drop-zone--hover');
    }
  });
  programmeEl.addEventListener('dragleave', (e) => {
    const z = e.target.closest('.drop-zone');
    if (z) z.classList.remove('drop-zone--hover');
  });
  programmeEl.addEventListener('drop', (e) => {
    const z = e.target.closest('.drop-zone');
    if (!z) return;
    e.preventDefault();
    z.classList.remove('drop-zone--hover');
    const typeId = e.dataTransfer.getData('text/x-block-type');
    if (!typeId || !BLOCK_TYPES[typeId]) return;
    const newBlock = {
      id: generateBlockId(),
      type: typeId,
      params: defaultParamsFor(typeId)
    };
    if (BLOCK_TYPES[typeId].accepts_children) newBlock.children = [];
    const dropTarget = {
      insertIndex: parseInt(z.dataset.insertIndex || '0', 10),
      parentId: z.dataset.parentId || null
    };
    onChange(insertBlock(getProgramme(), dropTarget, newBlock));
  });

  // ── Mobile Pointer Events ─────────────────────────────────────────────────
  let dragGhost = null;
  let dragTypeId = null;

  toolboxEl.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.toolbox-block');
    if (!item || e.pointerType === 'mouse') return;
    dragTypeId = item.dataset.templateType;
    dragGhost = item.cloneNode(true);
    dragGhost.classList.add('drag-ghost');
    dragGhost.style.position = 'fixed';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.left = `${e.clientX - 30}px`;
    dragGhost.style.top = `${e.clientY - 15}px`;
    dragGhost.style.zIndex = '9999';
    dragGhost.style.opacity = '0.8';
    document.body.appendChild(dragGhost);
    item.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', (e) => {
    if (!dragGhost) return;
    dragGhost.style.left = `${e.clientX - 30}px`;
    dragGhost.style.top = `${e.clientY - 15}px`;
    document.querySelectorAll('.drop-zone--hover').forEach(z => z.classList.remove('drop-zone--hover'));
    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    const z = elBelow?.closest('.drop-zone');
    if (z) z.classList.add('drop-zone--hover');
  });

  document.addEventListener('pointerup', (e) => {
    if (!dragGhost) return;
    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    const z = elBelow?.closest('.drop-zone');
    if (z && dragTypeId && BLOCK_TYPES[dragTypeId]) {
      const newBlock = {
        id: generateBlockId(),
        type: dragTypeId,
        params: defaultParamsFor(dragTypeId)
      };
      if (BLOCK_TYPES[dragTypeId].accepts_children) newBlock.children = [];
      const dropTarget = {
        insertIndex: parseInt(z.dataset.insertIndex || '0', 10),
        parentId: z.dataset.parentId || null
      };
      onChange(insertBlock(getProgramme(), dropTarget, newBlock));
    }
    dragGhost.remove();
    dragGhost = null;
    dragTypeId = null;
    document.querySelectorAll('.drop-zone--hover').forEach(z => z.classList.remove('drop-zone--hover'));
  });
}

export function attachStepMode(toolboxEl, onTap) {
  toolboxEl.addEventListener('click', (e) => {
    const item = e.target.closest('.toolbox-block');
    if (!item || !toolboxEl.contains(item)) return;
    const typeId = item.dataset.templateType;
    if (!typeId || !BLOCK_TYPES[typeId]) return;
    onTap({
      type: typeId,
      defaultParams: defaultParamsFor(typeId)
    });
  });
}

export function renderStudentInputs(inputsConfig, onChange) {
  const container = document.createElement('div');
  container.classList.add('student-inputs');

  // Track current values
  const state = {};
  for (const cfg of inputsConfig) {
    state[cfg.id] = cfg.default;
  }

  for (const cfg of inputsConfig) {
    const row = document.createElement('div');
    row.classList.add('student-input-row');

    const label = document.createElement('label');
    label.classList.add('student-input-label');
    label.textContent = cfg.label;
    row.appendChild(label);

    const range = document.createElement('input');
    range.type = 'range';
    range.classList.add('student-input-range');
    range.dataset.inputId = cfg.id;
    range.min = String(cfg.min);
    range.max = String(cfg.max);
    range.step = '1';
    range.value = String(cfg.default);
    row.appendChild(range);

    const readout = document.createElement('span');
    readout.classList.add('student-input-readout');
    readout.textContent = String(cfg.default);
    row.appendChild(readout);

    range.addEventListener('input', () => {
      const v = parseInt(range.value, 10);
      state[cfg.id] = v;
      readout.textContent = String(v);
      onChange({ ...state });
    });

    container.appendChild(row);
  }

  return container;
}

// Pure setter: returns a new programme tree where the block with the
// matching id has its `params[paramName]` set to `value`. Walks children
// recursively so nested blocks inside `repeat` are reachable.
export function setBlockParam(programme, blockId, paramName, value) {
  function recur(list) {
    return list.map(b => {
      if (b.id === blockId) {
        return { ...b, params: { ...b.params, [paramName]: value } };
      }
      if (b.children) {
        return { ...b, children: recur(b.children) };
      }
      return b;
    });
  }
  return recur(programme);
}

export function applyFillMode(programmeEl, editableSlots) {
  const editable = new Set(editableSlots || []);
  const inputs = programmeEl.querySelectorAll('input[data-block-id][data-param]');
  inputs.forEach(input => {
    const slotId = `${input.dataset.blockId}.${input.dataset.param}`;
    if (editable.has(slotId)) {
      input.disabled = false;
      input.readOnly = false;
      input.classList.add('block-input--editable');
      input.classList.remove('block-input--locked');
    } else {
      input.disabled = true;
      input.readOnly = true;
      input.classList.add('block-input--locked');
      input.classList.remove('block-input--editable');
    }
  });
}

function el(tag, className, textContent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

function renderGhost(svg, targetShape) {
  if (!targetShape) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'ghost');
  const segs = renderTargetShape(targetShape, 500);
  for (const s of segs) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', s.x1);
    line.setAttribute('y1', s.y1);
    line.setAttribute('x2', s.x2);
    line.setAttribute('y2', s.y2);
    line.setAttribute('stroke', '#1E2A4D');
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    g.appendChild(line);
  }
  svg.appendChild(g);
}

export function init(rootEl, config) {
  // Reset root
  while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
  rootEl.classList.add('dessin-blocs-app');

  // Header with back-to-launcher link
  const header = el('header', 'app-header');
  const back = document.createElement('a');
  back.className = 'app-back';
  back.href = './index-dessin.html';
  back.textContent = '← Retour';
  back.setAttribute('aria-label', 'Retour à la liste des exercices');
  header.appendChild(back);
  header.appendChild(el('h1', null, config.title || ''));
  rootEl.appendChild(header);

  const layoutContainer = el('div', 'app-body');

  // Intro
  if (config.intro_fr) {
    const intro = el('div', 'intro', config.intro_fr);
    layoutContainer.appendChild(intro);
  }

  // Student inputs state
  let studentState = {};
  if (config.studentInputs && config.studentInputs.length > 0) {
    for (const c of config.studentInputs) studentState[c.id] = c.default;
    const si = renderStudentInputs(config.studentInputs, (state) => {
      studentState = state;
      paintCanvas(); // re-place turtle at the new shape's first vertex
    });
    layoutContainer.appendChild(si);
  }

  // Layout. We'll add layout--no-toolbox later iff toolbox ends up empty.
  const layout = el('div', 'layout');
  layoutContainer.appendChild(layout);
  rootEl.appendChild(layoutContainer);

  // Programme state. We seed any `null` params with the block-type
  // defaults so the UI input value and the underlying model agree on load.
  let programme = seedDefaults(JSON.parse(JSON.stringify(config.starterProgramme || [])));

  // Toolbox vocabulary. If config doesn't specify one (typical for fill
  // mode), auto-derive from the starterProgramme so students see the
  // available blocks as a non-draggable reference.
  let toolboxIds = config.toolbox && config.toolbox.length > 0
    ? config.toolbox
    : (config.mode === 'fill' ? collectBlockTypes(programme) : []);
  if (toolboxIds.length === 0) layout.classList.add('layout--no-toolbox');

  const tbHost = el('div', 'toolbox-host');
  const pHost = el('div', 'programme-host');
  const canvasPane = el('div', 'canvas-pane');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 500 500');
  svg.setAttribute('width', '500');
  svg.setAttribute('height', '500');
  canvasPane.appendChild(svg);

  // Controls
  const controls = el('div', 'controls');
  const execBtn = el('button', 'btn btn-execute', 'Exécuter');
  const resetBtn = el('button', 'btn btn-reset', 'Réinitialiser');
  const abortBtn = el('button', 'btn btn-abort hidden', 'Arrêter');
  controls.appendChild(execBtn);
  controls.appendChild(abortBtn);
  controls.appendChild(resetBtn);
  canvasPane.appendChild(controls);

  const feedback = el('div', 'feedback hidden');
  canvasPane.appendChild(feedback);

  layout.appendChild(tbHost);
  layout.appendChild(pHost);
  layout.appendChild(canvasPane);

  let abortController = null;

  function resolveProgramme(prog, state) {
    function recur(list) {
      return list.map(b => {
        const params = { ...b.params };
        for (const [k, v] of Object.entries(params)) {
          if (typeof v === 'string' && v.startsWith('studentInputs.')) {
            const key = v.split('.')[1];
            params[k] = state[key];
          }
        }
        const out = { ...b, params };
        if (b.children) out.children = recur(b.children);
        return out;
      });
    }
    return recur(prog);
  }

  function rerender() {
    while (tbHost.firstChild) tbHost.removeChild(tbHost.firstChild);
    while (pHost.firstChild) pHost.removeChild(pHost.firstChild);
    const tb = renderToolbox(toolboxIds);
    const p = renderProgramme(programme);
    tbHost.appendChild(tb);
    pHost.appendChild(p);

    // Wire input change → update programme model. Without this, edits to
    // disabled-looking inputs are ignored and the programme keeps its
    // starterProgramme `null` params, producing zero-length segments.
    p.addEventListener('input', (e) => {
      const inp = e.target;
      if (!(inp instanceof HTMLInputElement)) return;
      const blockId = inp.dataset.blockId;
      const param = inp.dataset.param;
      if (!blockId || !param) return;
      let value;
      if (inp.type === 'color') value = inp.value;
      else {
        const n = Number(inp.value);
        value = Number.isFinite(n) ? n : null;
      }
      programme = setBlockParam(programme, blockId, param, value);
    });

    const deletable = config.mode === 'build' || config.mode === 'step';
    if (deletable) {
      p.classList.add('programme--deletable');
      p.addEventListener('click', (e) => {
        const btn = e.target.closest('.block-delete');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.deleteBlockId;
        if (!id) return;
        programme = removeBlock(programme, id);
        feedback.classList.add('hidden');
        rerender();
        paintCanvas();
      });
    }

    if (config.mode === 'fill') {
      applyFillMode(p, config.editableSlots || []);
    } else if (config.mode === 'build') {
      attachDragHandlers(p, tb, () => programme, (next) => {
        programme = next;
        feedback.classList.add('hidden');
        rerender();
        paintCanvas();
      });
    } else if (config.mode === 'step') {
      attachStepMode(tb, ({ type, defaultParams }) => {
        const newId = `s${Date.now()}`;
        programme = [...programme, { id: newId, type, params: defaultParams }];
        feedback.classList.add('hidden');
        rerender();
        paintCanvas();
      });
    }
  }

  function paintCanvas() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    renderGhost(svg, resolveTargetShape(config.targetShape, studentState));
    const studentLayer = document.createElementNS(SVG_NS, 'g');
    studentLayer.setAttribute('class', 'student');
    svg.appendChild(studentLayer);
    const startState = computeTurtleStart(config, studentState);
    const turtle = new Turtle({ width: 500, height: 500, ...(startState || {}) });
    paintTurtle(svg, turtle);
    return { studentLayer, turtle };
  }

  function resolveTargetShape(shape, state) {
    if (!shape) return null;
    const out = { ...shape };
    if (typeof out.sidesFrom === 'string') {
      const key = out.sidesFrom.split('.')[1];
      if (state && state[key] !== undefined) out.sides = state[key];
    }
    return out;
  }

  function showFeedback(kind, message) {
    feedback.className = `feedback feedback--${kind}`;
    feedback.textContent = message;
  }

  async function runProgramme() {
    feedback.classList.add('hidden');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    renderGhost(svg, resolveTargetShape(config.targetShape, studentState));
    const startState = computeTurtleStart(config, studentState);
    const turtle = new Turtle({ width: 500, height: 500, ...(startState || {}) });
    const resolved = resolveProgramme(programme, studentState);
    let commands;
    try {
      commands = flatten(resolved);
    } catch (err) {
      showFeedback('error', err.message);
      return;
    }
    abortBtn.classList.remove('hidden');
    execBtn.disabled = true;
    abortController = new AbortController();
    const studentLayer = document.createElementNS(SVG_NS, 'g');
    studentLayer.setAttribute('class', 'student');
    svg.appendChild(studentLayer);
    paintTurtle(svg, turtle);

    const speedMultiplier = Math.max(1, commands.length / 15);

    try {
      for (const cmd of commands) {
        if (abortController.signal.aborted) throw new Error('Execution aborted');
        await animate(svg, studentLayer, turtle, cmd, {
          signal: abortController.signal,
          speedMultiplier
        });
      }
      const result = validate(turtle.segments, config, { studentInputs: studentState });
      if (result.pass) showFeedback('success', 'Bravo ! Tu as réussi.');
      else showFeedback('error', result.hint);
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      abortBtn.classList.add('hidden');
      execBtn.disabled = false;
      abortController = null;
    }
  }

  execBtn.addEventListener('click', () => { runProgramme(); });
  resetBtn.addEventListener('click', () => {
    abortController?.abort();
    programme = seedDefaults(JSON.parse(JSON.stringify(config.starterProgramme || [])));
    feedback.classList.add('hidden');
    rerender();
    paintCanvas();
  });
  abortBtn.addEventListener('click', () => { abortController?.abort(); });

  // Initial render
  rerender();
  paintCanvas();

  // Iframe height reporting
  if (config.interactionCode) {
    observeAndReport(config.interactionCode, rootEl);
  }
}
