import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs';
const INTERACTION_CODE_RE = /^BD_\d+$/;

// HTML attribute / text content escaper. Used everywhere we interpolate
// user-authored config strings (titles, intros) into generated markup so
// a stray `&`, `<`, quote, or markup-looking title can't break the wrapper
// or inject content into the launcher.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function stampWrappers({ root } = {}) {
  root = root || join(dirname(fileURLToPath(import.meta.url)), '..');

  const exerciseFiles = readdirSync(join(root, 'exercises'))
    .filter(f => f.endsWith('.json'))
    .sort();

  const exercises = exerciseFiles.map(f => ({
    file: f,
    ...JSON.parse(readFileSync(join(root, 'exercises', f), 'utf8'))
  }));

  const seenIds = new Set();
  for (const ex of exercises) {
    if (seenIds.has(ex.id)) throw new Error(`Duplicate id: ${ex.id}`);
    seenIds.add(ex.id);
    if (!INTERACTION_CODE_RE.test(ex.interactionCode)) {
      throw new Error(`Malformed interactionCode in ${ex.file}: ${ex.interactionCode}`);
    }
    // Defensive: filename basename must equal config id so wrappers and
    // manifest URLs stay in sync.
    const expectedFile = `${ex.id}.json`;
    if (ex.file !== expectedFile) {
      throw new Error(`Filename/id mismatch: ${ex.file} declares id=${ex.id}, expected file ${expectedFile}`);
    }
  }

  const template = readFileSync(join(root, '_engine', 'exercise-shell.html'), 'utf8');
  const manifest = [];

  for (const ex of exercises) {
    const wrapperName = ex.file.replace(/\.json$/, '.html');
    const html = template
      .replaceAll('{{TITLE}}', escapeHtml(ex.title))
      .replaceAll('{{EXERCISE_ID}}', escapeHtml(ex.id));
    writeFileSync(join(root, wrapperName), html);

    const url = `${BASE_URL}/${wrapperName}`;
    const iframeHtml = `<iframe src="${url}" width="100%" frameborder="0" scrolling="no" style="border:0;display:block;width:100%;" allow="fullscreen"></iframe>`;
    manifest.push({
      id: ex.interactionCode,
      title: ex.title,
      iframeUrl: url,
      interactionCode: ex.interactionCode,
      iframeHtml
    });
  }

  const indexHtml = renderIndex(exercises);
  writeFileSync(join(root, 'index-dessin.html'), indexHtml);

  mkdirSync(join(root, '_build'), { recursive: true });
  writeFileSync(join(root, '_build', 'embed-manifest.json'), JSON.stringify(manifest, null, 2));

  return { wrappers: exercises.length, manifest };
}

function renderIndex(exercises) {
  const items = exercises.map(ex => {
    const wrapper = escapeHtml(ex.file.replace(/\.json$/, '.html'));
    const intro = escapeHtml(ex.intro_fr || '');
    const title = escapeHtml(ex.title);
    return `    <li><a href="./${wrapper}"><strong>${title}</strong><span>${intro}</span></a></li>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atelier Dessin par Blocs — Informatique 9e</title>
<link rel="stylesheet" href="./_engine/fonts.css">
<style>
  body { font-family: 'Inter', system-ui, sans-serif; background: #F5EFDE; color: #1E2A4D; margin: 0; padding: 2rem 1rem; }
  .wrap { max-width: 720px; margin: 0 auto; }
  h1 { font-family: 'Lora', serif; color: #BF5A24; margin: 0 0 .5rem; }
  p.lede { color: #1F4D3C; margin: 0 0 1.5rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin: 0 0 .75rem; }
  li a { display: block; padding: 1rem 1.25rem; background: #fff; border: 1px solid #E8DDC0; border-radius: 12px; text-decoration: none; color: inherit; }
  li a strong { display: block; font-family: 'Lora', serif; font-size: 1.15rem; color: #1E2A4D; margin: 0 0 .25rem; }
  li a span { display: block; color: #6E5E3D; font-size: .9rem; }
  li a:hover, li a:focus { border-color: #BF5A24; background: #FBF6E6; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Atelier Dessin par Blocs</h1>
  <p class="lede">7 exercices pour découvrir la programmation par blocs en dessinant avec une tortue.</p>
  <ul>
${items}
  </ul>
</div>
</body>
</html>
`;
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  stampWrappers()
    .then(r => console.log(`Stamped ${r.wrappers} wrappers + index + manifest`))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}
