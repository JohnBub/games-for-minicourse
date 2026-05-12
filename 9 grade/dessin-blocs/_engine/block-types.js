// _engine/block-types.js

export const CATEGORY_COLORS = {
  mouvement: '#BF5A24',
  stylo:     '#1F4D3C',
  boucles:   '#B8893A',
  maths:     '#1E2A4D'
};

export const BLOCK_TYPES = {
  forward: {
    category: 'mouvement', color: CATEGORY_COLORS.mouvement, label: 'avancer',
    params: { distance: { type: 'number', required: true, default: 100, min: 0, max: 500, step: 5 } },
    accepts_children: false
  },
  back: {
    category: 'mouvement', color: CATEGORY_COLORS.mouvement, label: 'reculer',
    params: { distance: { type: 'number', required: true, default: 50, min: 0, max: 500, step: 5 } },
    accepts_children: false
  },
  'turn-right': {
    category: 'mouvement', color: CATEGORY_COLORS.mouvement, label: 'tourner droite',
    params: { angle: { type: 'number', required: true, default: 90, suffix: '°', min: 0, max: 360, step: 1 } },
    accepts_children: false
  },
  'turn-left': {
    category: 'mouvement', color: CATEGORY_COLORS.mouvement, label: 'tourner gauche',
    params: { angle: { type: 'number', required: true, default: 90, suffix: '°', min: 0, max: 360, step: 1 } },
    accepts_children: false
  },
  'pen-up': {
    category: 'stylo', color: CATEGORY_COLORS.stylo, label: 'lever stylo',
    params: {},
    accepts_children: false
  },
  'pen-down': {
    category: 'stylo', color: CATEGORY_COLORS.stylo, label: 'baisser stylo',
    params: {},
    accepts_children: false
  },
  'set-color': {
    category: 'stylo', color: CATEGORY_COLORS.stylo, label: 'couleur',
    params: { color: { type: 'color', required: true, default: '#1F4D3C' } },
    accepts_children: false
  },
  repeat: {
    category: 'boucles', color: CATEGORY_COLORS.boucles, label: 'répéter',
    params: { times: { type: 'number', required: true, default: 4, suffix: 'fois', min: 1, max: 100, step: 1 } },
    accepts_children: true
  },
  number: {
    category: 'maths', color: CATEGORY_COLORS.maths, label: 'nombre',
    params: { value: { type: 'number', required: true, default: 0 } },
    accepts_children: false
  },
  'divide-360-by': {
    category: 'maths', color: CATEGORY_COLORS.maths, label: '360 ÷',
    params: { divisor: { type: 'number', required: true, default: 4 } },
    accepts_children: false
  }
};

export function isValidBlock(block) {
  if (!block || typeof block !== 'object') return false;
  if (typeof block.id !== 'string' || !block.id) return false;
  const def = BLOCK_TYPES[block.type];
  if (!def) return false;
  if (!block.params || typeof block.params !== 'object') return false;
  for (const [paramName, paramSpec] of Object.entries(def.params)) {
    if (paramSpec.required && !(paramName in block.params)) return false;
  }
  if (def.accepts_children) {
    if (block.children !== undefined && !Array.isArray(block.children)) return false;
  }
  return true;
}
