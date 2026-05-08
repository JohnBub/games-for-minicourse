// _engine/builder.js

import { BLOCK_TYPES, isValidBlock } from './block-types.js';

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
