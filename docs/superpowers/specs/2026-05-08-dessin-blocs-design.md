# Dessin par Blocs — Mini-cours design

**Status:** Draft for review
**Date:** 2026-05-08
**Owner:** John (Maestro orchestrator)
**Audience:** Cycle d'orientation 9e Informatique (Cayla, ~14 yo, French language)
**Brainstorm session:** 2026-05-08 Maestri canvas

## 1. Goal

Build a self-contained mini-unit teaching 9e students to draw geometric shapes (carré, rectangle, triangle, polygones réguliers, rosace) using block code in a simplified Scratch-style turtle sandbox, plus a "création libre" canvas. Two deliverables:

1. **Theory PDFs** (in French) — fed to the existing MiniCourse generator pipeline, output to `PDF_Eleves/BD_*.pdf`.
2. **Live HTML sandboxes** — hosted on GitHub Pages, embedded via iframe in the MiniCourse PDFs.

## 2. Non-goals

- Not a Module-4 replacement. This is a **standalone bonus unit** (`BD_` prefix) parallel to `Module_1_Securite` and `Module_2_Chiffrement` — used for fast finishers, evaluations, or remediation.
- Not Scratch-clone parity. We use Blockly with a small focused toolbox (mouvement / stylo / boucles / maths). No events, no broadcasts, no sprites, no sound.
- Not full PER curriculum coverage. The unit is one slot, not a programming course.
- Not multi-platform. macOS-only authoring; sandboxes are mobile-web (iOS Safari + Android Chrome) friendly because students use their own phones in class.
- Not Module 4 integration in this spec. The existing `Module_4_Programmation/` folder stays empty for now; integration into a Module 4 narrative is deferred.

## 3. Pedagogical progression (7 exercises)

The progression is engineered so exercise N's insight unlocks exercise N+1:

| # | Exercise | Concept introduced | Validation |
|---|---|---|---|
| 1 | Découvrir la tortue | `avancer` / `tourner` — no loops yet | none (free exploration) |
| 2 | Carré | `répéter 4 × { … }` + 90° | lenient ghost-overlay |
| 3 | Rectangle | Two lengths in a repeating motif | lenient ghost-overlay |
| 4 | Triangle équilatéral | **120° external angle** (the surprise — not 60°) | strict ghost-overlay + 3-side check |
| 5 | Polygones réguliers | **Generalization: angle = 360 / n** | strict + N-side check (student picks N) |
| 6 | Rosace | **Procedure** `dessiner_polygone` + outer rotation loop | strict + radial-symmetry check |
| 7 | Création libre | Open canvas, save PNG | none |

Exercise 5 is the load-bearing pedagogical lever: students discover `360/n` themselves by trying angle values until the polygon closes. Once they own that formula, the rosace's outer loop (`répéter 12 { dessiner_polygone ; tourner 30 }`) becomes authorable rather than copied.

Exercise 6 introduces Blockly **procedures** (define-and-call) to collapse cognitive load: without them, the rosace is quadruple-nested and overwhelming.

## 4. Architecture

### 4.1 Engine (built once, reused 7×)

```
9 grade/dessin-blocs/_engine/
├── vendor/blockly/        # pinned version, vendored — no CDN
├── turtle-blockly.js      # block defs + AST compiler (NOT eval)
├── turtle-blockly.css     # Renardo theme overrides
├── turtle-interpreter.js  # AST executor with bounds + abort
├── turtle-renderer.js     # canvas turtle ops
├── validator.js           # geometric checks + masked-IoU
├── iframe-bridge.js       # SET_INSTRUCTION_HEIGHT postMessage
└── exercise-shell.html    # template stamped into 7 wrappers
```

### 4.2 Custom block toolbox (Blockly, French)

| Category (color) | Blocks |
|---|---|
| Mouvement (rust `#BF5A24`) | `avancer (___)`, `reculer (___)`, `tourner droite (___ °)`, `tourner gauche (___ °)` |
| Stylo (forest `#1F4D3C`) | `lever stylo`, `baisser stylo`, `couleur (___)` |
| Boucles (gold `#B8893A`) | `répéter (___ fois) { … }` (supports nesting) |
| Maths (navy `#1E2A4D`) | `nombre`, `360 / ___` |
| Procédures (only in ex 6+7) | `définir dessiner_polygone (côtés, taille)`, `appeler` |

Block type identifiers stay ASCII. French labels go through Blockly's field APIs / `textContent`, not `innerHTML`.

### 4.3 AST interpreter (not eval)

Blocks compile to a turtle-command AST/list. A separate interpreter executes commands with hard limits, animating execution at 60fps (one command per frame).

```
MAX_COMMANDS      = 5000
MAX_LOOP_DEPTH    = 4
EXECUTION_TIMEOUT = 3000 ms
ABORT_BUTTON      = visible during exécution
```

Friendly French errors: "Trop de répétitions, ton programme tournerait pendant 5 minutes."

### 4.4 Validator (per-exercise levels)

| Ex | Mode | IoU threshold | Geometric checks |
|---|---|---|---|
| 1 | none | — | — |
| 2 | lenient | ≥ 0.70 | closed path + ~4 sides |
| 3 | lenient | ≥ 0.70 | closed + bbox ratio ~5:3 |
| 4 | strict | ≥ 0.80 | closed + 3 equal sides + 60° interior angles |
| 5 | strict | ≥ 0.80 | closed + N sides matching student's N |
| 6 | strict | ≥ 0.75 | radial-symmetric (rotational match) |
| 7 | none | — | — |

**Scoring canvas**: separate offscreen canvas at fixed 500×500 px (NOT device-pixel-ratio). Both ghost target and student stroke rendered as binary masks with normalized line width. Student stroke dilated by 4 px before scoring to absorb antialiasing and small angle errors.

### 4.5 Iframe contract

Preserves the existing `s3_02_repeter.html` postMessage protocol so MiniCourse PDF iframes don't clip the Blockly workspace:

```js
window.parent.postMessage({
  interactionCode,            // unique per exercise (BD_1 … BD_7)
  type: 'SET_INSTRUCTION_HEIGHT',
  value: height
}, '*');
```

`interactionCode` is set per-wrapper from the JSON config.

### 4.6 Per-exercise wrappers

7 thin HTML files, each ~30 lines, generated from `exercise-shell.html` by `_build/stamp-wrappers.mjs`.

**Wrapper config handoff** (corrected pattern — inline `<script src=...>` content is ignored by browsers):

```html
<script>window.DESSIN_BLOCS_EXERCISE = "02-carre";</script>
<script src="./_engine/turtle-blockly.js"></script>
```

### 4.7 JSON exercise configs

```jsonc
// 02-carre.json
{
  "id": "02-carre",
  "title": "Le carré",
  "interactionCode": "BD_2",
  "intro_fr": "Dessine un carré en utilisant une boucle.",
  "toolbox": ["mouvement", "boucles", "maths"],
  "validation": {
    "mode": "lenient",
    "iou": 0.70,
    "geometric": ["closed", "n-sides:4"]
  },
  "targetShape": {
    "kind": "regularPolygon",
    "sides": 4,
    "size": 200,
    "center": [250, 250]
  }
}

// 05-polygones-reguliers.json — DYNAMIC target
{
  "id": "05-polygones-reguliers",
  "interactionCode": "BD_5",
  "intro_fr": "Choisis un nombre de côtés N (entre 3 et 8). À toi de trouver le bon angle !",
  "toolbox": ["mouvement", "boucles", "maths"],
  "validation": {
    "mode": "strict",
    "iou": 0.80,
    "geometric": ["closed", "n-sides:studentChoice"]
  },
  "targetShape": {
    "kind": "regularPolygon",
    "sidesFrom": "studentChoice",
    "sidesRange": [3, 8],
    "size": 200,
    "center": [250, 250]
  },
  "studentInputs": [
    {"id": "n", "label": "N (côtés)", "min": 3, "max": 8}
  ]
}

// 06-rosace.json — uses Blockly procedures
{
  "id": "06-rosace",
  "interactionCode": "BD_6",
  "intro_fr": "Définis une procédure pour ton polygone, puis répète-la en tournant.",
  "toolbox": ["mouvement", "boucles", "maths", "procedures"],
  "validation": {
    "mode": "strict",
    "iou": 0.75,
    "geometric": ["radial-symmetric:12"]
  },
  "targetShape": {
    "kind": "rosace",
    "petals": 12,
    "petalShape": "regularPolygon",
    "petalSides": 5,
    "petalSize": 80,
    "center": [250, 250]
  }
}

// 07-creation-libre.json — no target
{
  "id": "07-creation-libre",
  "interactionCode": "BD_7",
  "intro_fr": "Canvas libre — invente ton propre dessin !",
  "toolbox": ["mouvement", "stylo", "boucles", "maths", "procedures"],
  "validation": { "mode": "none" },
  "targetShape": null,
  "savePng": true
}
```

## 5. File layout

### 5.1 Games for MiniCourse repo (gh-pages-hosted)

```
~/Documents/GitHub/Games for MiniCourse/
└── 9 grade/dessin-blocs/
    ├── _engine/                            (8 files, see §4.1)
    ├── exercises/                          (7 JSON configs)
    ├── 01-decouvrir-tortue.html  …  07-creation-libre.html
    ├── index-dessin.html                   (launcher menu)
    └── _build/stamp-wrappers.mjs           (regenerator)
```

Live URLs after push:
- `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/index-dessin.html`
- `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/0N-NAME.html` (×7)

### 5.2 Spring 2026 iCloud (theory side)

```
~/Library/.../Spring 2026/Informatique 9e/Bonus_Dessin_Blocs/
├── BD_1_Decouvrir_Tortue_{COURS,BUILDER,PROMPTS}.md
├── BD_2_Carre_{COURS,BUILDER,PROMPTS}.md
├── BD_3_Rectangle_{COURS,BUILDER,PROMPTS}.md
├── BD_4_Triangle_{COURS,BUILDER,PROMPTS}.md
├── BD_5_Polygones_Reguliers_{COURS,BUILDER,PROMPTS}.md
├── BD_6_Rosace_{COURS,BUILDER,PROMPTS}.md
└── BD_7_Creation_Libre_{COURS,BUILDER,PROMPTS}.md
```

→ MiniCourse generator → `PDF_Eleves/BD_1_Decouvrir_Tortue.pdf` … `BD_7_Creation_Libre.pdf` (7 PDFs).

Each `BUILDER.md` embeds the iframe URL of its matching live exercise + an HTML block sized for the iframe height contract.

### 5.3 Brand consistency

- Renardo palette: rust `#BF5A24`, forest `#1F4D3C`, navy `#1E2A4D`, gold `#B8893A`, paper `#F5EFDE`
- Fonts: Lora (serif, headings) + Inter (sans, UI/body)
- Mobile-first, 44px tap targets, touch-event handlers (matches Unit 6 convention)
- No `innerHTML` in our shell code (Blockly's internal SVG manipulation is exempt — that's library-internal, not our DOM injection surface)

## 6. Orchestration plan (Maestri canvas, 3 lanes)

### 6.1 Workstream DAG

```
Phase 0   Spec approval (this doc)
            │
            ├── L1 (this thread): integration + W4–W7
            │
Phase 1   ─┼── L2 (Codex recruit): W3 sandbox engine
            │
            └── L3 (Atelier recruit): W1 + W2 = 21 markdown files
                                          (cross-reviewed by L4 Gemini, optional)

Phase 2   Integration: stamp wrappers, build index, smoke test
Phase 3   Reviews: L4 Gemini on French, /rp-review on JS engine
Phase 4   Push gh-pages, run minicourse generator, verify 7 PDFs
Phase 5   Manual test: 1 exercise on iPhone, iPad, Chrome desktop
```

### 6.2 Lane assignment

| Lane | Agent | Preset | Workstream | Why |
|---|---|---|---|---|
| L1 | This thread (Maestro) | Maestri canvas head | W4 wrappers, W5 index, W6 PDF gen, W7 push, integration, final review | Architectural glue — reads all sub-outputs and binds them |
| L2 | Maestri recruit "Codex" | Codex CLI / GPT-5.5 Medium | W3 — Blockly engine (8 files) | Per RP April 2026 model rec, GPT-5.5 Medium is best agent for JS-heavy work |
| L3 | Maestri recruit "Atelier" | Claude Code | W1 + W2 — 21 French markdown files | Mirror existing Module_1/2 patterns. Strong at structured French pedagogy |
| L4 (optional) | Maestri recruit "Gemini" | Gemini CLI | Cross-review L3's French | Cheap second opinion on age-appropriateness for ~14yo |

### 6.3 Spawning recipe

```bash
maestri recruit "Codex"   --preset "Codex CLI"
maestri recruit "Atelier" --preset "Claude Code"
maestri recruit "Gemini"  --preset "Gemini CLI"   # optional
maestri ask "Codex"   "<engine spec from §4>"
maestri ask "Atelier" "<theory writing brief from §3>"
```

### 6.4 Why Maestri over RepoPrompt `agent_run`

Both work. Maestri wins here because (a) the user is already on the canvas; (b) sub-terminals are visually inspectable; (c) the user can intervene in any recruit directly; (d) Maestri-as-installer is a validated pattern in the user's `reference_maestri.md` memory.

RepoPrompt's role: I (L1) use `oracle_send mode=review` from this thread for design-critical reviews after each lane completes. `/rp-review` runs against the dessin-blocs branch before push.

## 7. Risks & mitigations (from oracle review)

| Risk | Severity | Mitigation |
|---|---|---|
| Wrapper script tag with both `src` and inline content | P0 | Use `window.DESSIN_BLOCS_EXERCISE = "..."` in separate `<script>` tag. Documented in §4.6. |
| Student creates infinite loop, freezes phone | P1 | AST interpreter with `MAX_COMMANDS=5000`, `EXECUTION_TIMEOUT=3000ms`, abort button. NEVER eval generated JS. |
| Validator too brittle (correct solutions fail) | P1 | Score on fixed 500×500 mask (not DPR), normalize stroke width, dilate by 4 px, combine IoU + geometric checks. Lenient early, strict later. |
| MiniCourse iframe clips Blockly workspace | P1 | Preserve existing `SET_INSTRUCTION_HEIGHT` postMessage contract from `s3_02_repeter.html`. Per-exercise `interactionCode`. |
| Static `targetShape` insufficient for ex 5/6 | P1 | Schema includes `sidesFrom: "studentChoice"` for ex 5, dedicated `kind: "rosace"` with petal config for ex 6. |
| Blockly CDN failure breaks classroom | P1 | Vendor pinned Blockly into `_engine/vendor/`. No CDN. |
| URL encoding `9%20grade` mistakes 404s | P2 | Use `%20` consistently in iframe srcs and BUILDER.md embeds. Smoke-test each URL post-push. |
| 7 wrappers drift apart over time | P2 | Generator script `_build/stamp-wrappers.mjs` regenerates all 7 from JSON + template. Commit generator + outputs both. |
| Mobile layout cramped | P2 | Prototype mobile shell BEFORE building 7 exercises: sticky Exécuter/Réinitialiser buttons, canvas-above-blocks split or tabbed view. |
| Ex 1 over-validated punishes exploration | P2 | Validation mode `none` for ex 1 and 7. Lenient for 2-3, strict for 4-6. |

## 8. Success criteria

1. All 7 HTML wrappers load on iOS Safari, Android Chrome, and Chrome desktop without console errors.
2. Each exercise's "Exécuter" produces a drawing within 3s for any student program ≤ 5000 commands.
3. Validation pass rate on a 5-student dry run: ≥ 80% of correct solutions pass; ≤ 5% of incorrect solutions falsely pass.
4. All 7 student PDFs generated by the MiniCourse pipeline render iframe at correct height in iOS Safari.
5. Engine + wrappers passes `/rp-review` on the dessin-blocs branch with no P0 findings.
6. French content reviewed by Gemini lane (or human) for age-appropriateness with ≤ 3 corrections per file.

## 9. Open questions (deferred — not blockers for spec approval)

1. **Print-friendly fallback**: should the BUILDER.md include a printable diagram of "expected blocks" for offline practice, or only the iframe?
2. **Procedures in ex 4–5 toolbox**: include them earlier (so students can experiment) or keep gated to ex 6+ to preserve the discovery moment?
3. **Save PNG in ex 7**: download to device or post to a teacher gallery? (Latter requires backend.)
4. **Test integration**: when does this slot into a class test? Spec defers this to a separate planning session.

## 10. Decision log

- **2026-05-08**: standalone unit chosen over Module-4 slot (option 3 in brainstorm).
- **2026-05-08**: Blockly + custom French turtle blocks chosen over custom Scratch-clone (option 1).
- **2026-05-08**: 7-exercise progression with intro + polygones générale (option 2 — pedagogically richer).
- **2026-05-08**: ghost-overlay validation chosen with geometric backstop after oracle review (option 1 + P1 hardening).
- **2026-05-08**: Maestri canvas chosen as orchestrator surface; RepoPrompt for design reviews from this thread.

## 11. Next step

After user approval of this spec, invoke the `superpowers:writing-plans` skill to turn §6 into a step-by-step implementation plan with checkpoints.
