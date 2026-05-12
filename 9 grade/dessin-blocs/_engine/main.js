import { init } from './builder.js';

const exerciseId = window.DESSIN_BLOCS_EXERCISE;
if (!exerciseId) throw new Error('DESSIN_BLOCS_EXERCISE not set');

const res = await fetch(`./exercises/${exerciseId}.json`);
if (!res.ok) throw new Error(`Cannot load exercise: ${exerciseId}`);
const config = await res.json();

init(document.getElementById('app'), config);
