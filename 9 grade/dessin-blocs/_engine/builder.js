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
