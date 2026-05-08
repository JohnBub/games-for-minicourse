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
