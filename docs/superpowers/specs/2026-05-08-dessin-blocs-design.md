# Dessin par Blocs — Mini-cours design

**Status:** Approved architecture; writing-plans next
**Date:** 2026-05-08 (revised after architecture pivot + 2 oracle reviews)
**Owner:** John (Maestro orchestrator)
**Audience:** Cycle d'orientation 9e Informatique (Cayla, ~14 yo, French language)
**Brainstorm session:** 2026-05-08 Maestri canvas

## 1. Goal

Build a self-contained mini-unit teaching 9e students to draw geometric shapes (carré, rectangle, triangle, polygones réguliers, rosace) using a **custom mini block builder** — Scratch-aesthetic without a library dependency — plus a "création libre" canvas. Two deliverables:

1. **Static theory PDFs** (in French) — generated from `BUILDER.md` files via the existing MiniCourse generator pipeline.
2. **Live HTML mini-games** — hosted on GitHub Pages, embedded as iframes inside the MiniCourse Generator (MCG) authoring tool by the teacher.

## 2. Non-goals

- Not a Module-4 replacement. Standalone bonus unit (`BD_` prefix) parallel to `Module_1_Securite` and `Module_2_Chiffrement` — used for fast finishers, evaluations, or remediation.
- Not Scratch-clone parity. No events, no broadcasts, no sprites, no sound, no procedure/function blocks. The toolbox is small and focused.
- **Not Google Blockly.** A custom ~700-line vanilla JS engine emulates the Scratch block-stacking aesthetic without the library bundle. No vendor folder, no service worker, no Google Fonts runtime dependency.
- Not full PER curriculum coverage. One slot, not a programming course.
- Not multi-platform. macOS-only authoring; sandboxes are mobile-web (iOS Safari + Android Chrome) friendly because students use their own phones in class.
- Not Module 4 integration in this spec. The empty `Module_4_Programmation/` folder stays untouched.

## 3. Pedagogical progression (7 exercises)

| # | Exercise | Mode | Concept introduced | Validation |
|---|---|---|---|---|
| 1 | Découvrir la tortue | step | `avancer` / `tourner` | none |
| 2 | Carré | fill | `répéter 4 × { … }` + 90° | lenient ghost-overlay |
| 3 | Rectangle | fill | Two lengths, repeating motif | lenient ghost-overlay |
| 4 | Triangle équilatéral | fill | **120° external angle** (the surprise — not 60°) | strict ghost-overlay |
| 5 | Polygones réguliers | fill+slider | **Generalization: angle = 360 / n** | strict, dynamic N |
| 6 | Rosace | build | Nested `répéter`: outer rotation + inner polygon | strict, radial-symmetric |
| 7 | Création libre | build | Free composition with full toolbox | none |

**On the 360/n insight (softened from earlier draft):** Exercise 5 *invites* discovery of `angle = 360 / n` — the validator is output-only, so a student who hardcodes `72` for `n=5` still passes. Teacher reinforces the formula verbally during class. Hardening this to AST-level enforcement is deferred (see §9 open questions).

## 4. Architecture — Mini Block Builder

### 4.1 Engine layout

```
9 grade/dessin-blocs/
├── _engine/
│   ├── builder.js         # Mini Block Builder — DOM block rendering, drag, drop zones
│   ├── interpreter.js     # AST executor with bounds + abort
│   ├── renderer.js        # SVG turtle ops (path, stroke, color)
│   ├── validator.js       # Geometric checks + masked-IoU
│   ├── iframe-bridge.js   # SET_INSTRUCTION_HEIGHT postMessage
│   └── builder.css        # Renardo theme — block colors, drop zones, layout
├── exercises/
│   ├── 01-decouvrir-tortue.json … 07-creation-libre.json
├── 01-decouvrir-tortue.html  …  07-creation-libre.html  # 7 wrappers
├── index-dessin.html                                     # launcher
├── _build/
│   ├── stamp-wrappers.mjs                                # regenerator
│   └── embed-manifest.json                               # for L3 BUILDER.md
└── README.md
```

Total budget: ~1500 LOC across `_engine/` (700 builder + 200 interpreter + 200 renderer + 250 validator + 100 bridge + 50 css scaffold).

### 4.2 Block model

Blocks are styled DOM `<div>`s, NOT Blockly. Each block is a small data object + a renderer function:

```js
// In-memory programme (after kid stacks blocks)
const programme = [
  {
    id: 'b1',
    type: 'repeat',
    params: { times: 4 },
    children: [
      { id: 'b2', type: 'forward', params: { distance: 100 } },
      { id: 'b3', type: 'turn', params: { direction: 'right', angle: 90 } }
    ]
  }
];
```

Visual: `repeat` block renders as a "C-shaped" container with a coloured header strip (gold `#B8893A`) and an indented child slot. Children render below at +20 px indent. Same drag-snap aesthetic as Scratch.

**Block types per category:**

| Category | Color | Block types |
|---|---|---|
| Mouvement | rust `#BF5A24` | `forward`, `back`, `turn-right`, `turn-left` |
| Stylo | forest `#1F4D3C` | `pen-up`, `pen-down`, `set-color` |
| Boucles | gold `#B8893A` | `repeat` (with child slot) |
| Maths | navy `#1E2A4D` | `number`, `divide-360-by` (only in ex 5+) |

Block type IDs are ASCII; French labels go through `textContent` only (no `innerHTML`).

### 4.3 Per-exercise modes (escalating freedom)

The engine supports three modes; per-exercise JSON config picks one:

| Mode | Used in ex | Editing freedom |
|---|---|---|
| **step** | 1 | Kid taps blocks in toolbox; each tap adds the block AND executes immediately. No assembly. |
| **fill** | 2-5 | Programme structure pre-loaded; only blanks (`{ params: { ?: null } }`) are editable. Toolbox is a number pad + (in ex 5) a slider. |
| **build** | 6-7 | Empty programme; full drag-from-toolbox-to-programme. Drop zones between blocks and inside loop bodies. |

```jsonc
// 02-carre.json — fill mode example
{
  "id": "02-carre",
  "title": "Le carré",
  "interactionCode": "BD_2",
  "intro_fr": "Complète ce programme pour dessiner un carré.",
  "mode": "fill",
  "starterProgramme": [
    { "id": "b1", "type": "repeat", "params": { "times": 4 }, "children": [
      { "id": "b2", "type": "forward", "params": { "distance": null } },
      { "id": "b3", "type": "turn-right", "params": { "angle": null } }
    ]}
  ],
  "editableSlots": ["b2.distance", "b3.angle"],
  "toolbox": ["number"],
  "validation": {
    "mode": "lenient",
    "iou": 0.70,
    "geometric": [
      { "check": "closed", "maxGapPx": 10 },
      { "check": "sideCount", "expected": 4 },
      { "check": "equalSides", "maxVarianceRatio": 0.15 }
    ]
  },
  "targetShape": { "kind": "regularPolygon", "sides": 4, "size": 200, "center": [250, 250] }
}
```

```jsonc
// 05-polygones-reguliers.json — fill+slider with dynamic target
{
  "id": "05-polygones-reguliers",
  "interactionCode": "BD_5",
  "intro_fr": "Choisis un nombre de côtés N. À toi de trouver le bon angle !",
  "mode": "fill",
  "studentInputs": [
    { "id": "n", "type": "integer", "label": "N (côtés)", "min": 3, "max": 8, "default": 5 }
  ],
  "starterProgramme": [
    { "id": "b1", "type": "repeat", "params": { "times": "studentInputs.n" }, "children": [
      { "id": "b2", "type": "forward", "params": { "distance": 100 } },
      { "id": "b3", "type": "turn-right", "params": { "angle": null } }
    ]}
  ],
  "editableSlots": ["b3.angle"],
  "toolbox": ["number", "divide-360-by"],
  "validation": {
    "mode": "strict",
    "iou": 0.80,
    "geometric": [
      { "check": "closed", "maxGapPx": 10 },
      { "check": "sideCount", "expectedFrom": "studentInputs.n" },
      { "check": "equalSides", "maxVarianceRatio": 0.15 }
    ]
  },
  "targetShape": {
    "kind": "regularPolygon",
    "sidesFrom": "studentInputs.n",
    "size": 200,
    "center": [250, 250]
  }
}
```

```jsonc
// 06-rosace.json — build mode, nested loops
{
  "id": "06-rosace",
  "interactionCode": "BD_6",
  "intro_fr": "Dessine un polygone à l'intérieur d'une boucle qui tourne.",
  "mode": "build",
  "starterProgramme": [],
  "toolbox": ["forward", "turn-right", "repeat", "number"],
  "validation": {
    "mode": "strict",
    "iou": 0.75,
    "geometric": [
      { "check": "rotationalSymmetry", "order": 12, "angleToleranceDeg": 4 },
      { "check": "sectorCoverage", "sectors": 12, "minCoverageRatio": 0.6 },
      { "check": "noSinglePolygonOnly" }
    ]
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
```

```jsonc
// 07-creation-libre.json — full toolbox, no target
{
  "id": "07-creation-libre",
  "interactionCode": "BD_7",
  "intro_fr": "Canvas libre — invente ton propre dessin !",
  "mode": "build",
  "starterProgramme": [],
  "toolbox": ["forward", "back", "turn-right", "turn-left", "pen-up", "pen-down", "set-color", "repeat", "number"],
  "validation": { "mode": "none" },
  "targetShape": null,
  "savePng": true
}
```

### 4.4 Interpreter (AST executor)

Compiles the `programme` array to a flat list of turtle commands, then executes with bounds:

```
MAX_COMMANDS         = 5000
COMMANDS_PER_FRAME   = 200          # ← batched for speed
MAX_LOOP_DEPTH       = 4
EXECUTION_TIMEOUT_MS = 3000
ABORT_BUTTON         = visible during exécution
```

At 200 cmd/frame × 60fps, a 5000-command programme finishes in ~0.4s of wall time. Interpreter yields to the event loop every frame so UI stays responsive. Hard timeout at 3s aborts and shows: *"Ton programme est trop long, simplifie-le."*

NEVER `eval`. The interpreter is a switch on `block.type`.

### 4.5 Validator

Two-stage:

**Stage 1 — Geometric checks** (always run first; they short-circuit). Validators are structured objects:

```ts
type GeometricCheck =
  | { check: 'closed'; maxGapPx: number }
  | { check: 'sideCount'; expected: number } | { check: 'sideCount'; expectedFrom: string }
  | { check: 'equalSides'; maxVarianceRatio: number }
  | { check: 'rotationalSymmetry'; order: number; angleToleranceDeg: number }
  | { check: 'sectorCoverage'; sectors: number; minCoverageRatio: number }
  | { check: 'noSinglePolygonOnly' }
  | { check: 'noSelfIntersection' }
```

**Stage 2 — Masked-IoU** (only if geometric checks pass).

- Both target shape and student stroke rendered as binary masks at fixed **500×500 px** (NOT device-pixel-ratio).
- Stroke dilated by 4 px before scoring → absorbs antialiasing + 1-2° angle drift.
- Pass if IoU ≥ threshold from JSON config (lenient 0.70, strict 0.80, rosace 0.75).

**Hint heuristics on fail:**
| Failure | Hint |
|---|---|
| `closed` fails (path doesn't close) | "Ta forme n'est pas fermée." |
| `sideCount` mismatch | "Tu as {N_actual} côtés, il en faut {N_expected}." |
| `equalSides` fails | "Tes côtés ne sont pas égaux." |
| Bbox too large/small | "Ta forme est trop {grande/petite}." |
| `rotationalSymmetry` fails | "Vérifie l'angle entre chaque pétale." |

### 4.6 Iframe contract (preserved from existing exercises)

```js
window.parent.postMessage({
  interactionCode,                  // "BD_2", "BD_5", etc. — per-exercise
  type: 'SET_INSTRUCTION_HEIGHT',
  value: height
}, '*');
```

Matches `s3_02_repeter.html` so MiniCourse Generator iframe sizing works without modification.

### 4.7 Wrapper script handoff (corrected)

Inline content inside `<script src="...">` is ignored by browsers. Use a separate config script:

```html
<!DOCTYPE html>
<html lang="fr"><head>… (head boilerplate) …</head><body>
  <div id="app"></div>
  <script>window.DESSIN_BLOCS_EXERCISE = "02-carre";</script>
  <script src="./_engine/builder.js"></script>
</body></html>
```

### 4.8 Wrapper generator contract — `_build/stamp-wrappers.mjs`

```
Inputs:
  - exercises/*.json                    (7 configs)
  - _engine/exercise-shell.html         (template with {{EXERCISE_ID}} placeholder)

Validates:
  - JSON schema (each config has id, interactionCode, mode, validation)
  - Unique IDs across all 7 configs
  - interactionCode matches /^BD_\d+$/
  - referenced JSON paths exist in toolbox vocabulary

Outputs:
  - 01-{name}.html … 07-{name}.html     (7 wrappers stamped from template)
  - index-dessin.html                    (launcher menu, links to all 7)
  - _build/embed-manifest.json           (consumed by L3b BUILDER.md authoring)

Failure: exit non-zero with explicit message on duplicate IDs, missing config,
         malformed interactionCode, or template stamp errors.
```

### 4.9 Embed manifest (for L3b)

Generated by stamp-wrappers.mjs. One entry per exercise:

```json
{
  "id": "BD_2",
  "title": "Carré",
  "iframeUrl": "https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/02-carre.html",
  "interactionCode": "BD_2",
  "iframeHtml": "<iframe src=\"https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/02-carre.html\" width=\"100%\" frameborder=\"0\" scrolling=\"no\" style=\"border:0;display:block;width:100%;\" allow=\"fullscreen\"></iframe>"
}
```

L3b pastes `iframeHtml` directly into each `BUILDER.md`. No fixed `height` attr — managed by `SET_INSTRUCTION_HEIGHT` at runtime.

## 5. File layout

### 5.1 Games for MiniCourse repo (gh-pages-hosted)

```
~/Documents/GitHub/Games for MiniCourse/
└── 9 grade/dessin-blocs/                      (see §4.1 for tree)
```

Live URLs after push:
- `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/index-dessin.html`
- `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/0N-NAME.html` (×7)

### 5.2 Spring 2026 iCloud (theory side, static PDFs only)

```
~/Library/Mobile Documents/com~apple~CloudDocs/Enseignement/Ressources/
  Informatique/Spring 2026/Informatique 9e/Bonus_Dessin_Blocs/
├── BD_1_Decouvrir_Tortue_{COURS,BUILDER,PROMPTS}.md
├── BD_2_Carre_{COURS,BUILDER,PROMPTS}.md
├── BD_3_Rectangle_{COURS,BUILDER,PROMPTS}.md
├── BD_4_Triangle_{COURS,BUILDER,PROMPTS}.md
├── BD_5_Polygones_Reguliers_{COURS,BUILDER,PROMPTS}.md
├── BD_6_Rosace_{COURS,BUILDER,PROMPTS}.md
└── BD_7_Creation_Libre_{COURS,BUILDER,PROMPTS}.md
```

### 5.3 Output pipeline (clarified after user input)

```
BUILDER.md  ─┐
             ├─→ MiniCourse generator  ─→  PDF_Eleves/BD_*.pdf  (static theory PDFs)
COURS.md   ──┘                                     │
                                                   ▼
                                          Teacher uploads PDFs to MCG
                                                   │
                                                   ▼
                                          Teacher embeds gh-pages iframes in MCG
                                                   │
                                                   ▼
                                          Final interactive course delivered to students
```

The static PDF is a clean theory document — no iframe rendering required. Iframe embedding happens inside MCG by the teacher, using the `iframeHtml` from `embed-manifest.json` (see §4.9).

### 5.4 Brand consistency

- Renardo palette: rust `#BF5A24`, forest `#1F4D3C`, navy `#1E2A4D`, gold `#B8893A`, paper `#F5EFDE`
- Fonts: **Lora + Inter, vendored in `_engine/fonts/`** with system fallback CSS (`font-family: 'Inter', system-ui, sans-serif`). No Google Fonts runtime dependency.
- Mobile-first, 44px tap targets, touch-event handlers (matches Unit 6)
- No `innerHTML` in shell code

## 6. Orchestration plan (Maestri canvas, 2 lanes + sub-split)

### 6.1 Workstream DAG (with hard sync points)

```
Phase 0   Spec approval (this doc)
            │
Phase 1   ─┼── L1 (this thread): engine + wrappers + index + embed-manifest
            │   ├─ engine (~1500 LOC vanilla JS in `_engine/`)
            │   ├─ 7 JSON configs in `exercises/`
            │   ├─ stamp-wrappers.mjs run → 7 wrappers + index-dessin.html + embed-manifest.json
            │   └─ smoke-test locally → push gh-pages → verify URLs
            │   (L1 does NOT write BUILDER.md — that's L3b)
            │
            └── L3a (Atelier recruit): 7×COURS.md + 7×PROMPTS.md (14 files)
                ├─ Pure French prose, no engine dep
                └─ Mirrors existing Module_1/2 patterns
                                                    │
                                                    ▼
                                            ── SYNC POINT ──
                                            (L1 publishes embed-manifest.json)
                                                    │
                                                    ▼
            └── L3b (Atelier recruit): 7×BUILDER.md
                ├─ Reads embed-manifest.json
                └─ Pastes iframeHtml + writes layout/headings

Phase 2   L1 integration: review L3 output, run /rp-review on JS engine
Phase 3   L4 (optional Gemini): cross-review French content
Phase 4   Push gh-pages, run minicourse generator on 7 BUILDER.md, verify 7 PDFs
Phase 5   Manual test: 1 exercise on iPhone, iPad, Chrome desktop
```

**Lane reduction from 3 to 2:** With Mini Block Builder replacing Blockly, the engine is small enough to be owned by L1 (this thread) instead of needing a Codex CLI lane. L1 + L3 (split into L3a/L3b) is the canonical pattern.

### 6.2 Lane assignment

| Lane | Agent | Surface | Workstream |
|---|---|---|---|
| **L1** | This thread | Maestri canvas head | Engine, wrappers, index, embed-manifest, integration, gh-pages push, BUILDER review |
| **L3a** | Atelier recruit (Claude Code preset) | Maestri canvas | 14 files: 7×COURS.md + 7×PROMPTS.md (parallel with L1) |
| **L3b** | Atelier recruit (same recruit, second pass) | Maestri canvas | 7×BUILDER.md after L1 publishes embed-manifest.json |
| **L4** (optional) | Gemini recruit | Maestri canvas | Cross-review of L3 French for age-appropriateness |

### 6.3 Spawning recipe

```bash
maestri recruit "Atelier" --preset "Claude Code"
maestri recruit "Gemini"  --preset "Gemini CLI"   # optional, Phase 3
maestri ask "Atelier" "<L3a brief: write 14 markdown files mirroring Module_1/2 patterns>"
# … L1 builds engine in this thread …
# Once embed-manifest.json exists:
maestri ask "Atelier" "<L3b brief: write 7 BUILDER.md using embed-manifest.json>"
```

### 6.4 Why Maestri over RepoPrompt agent_run

You're already on the canvas. Sub-terminals are visually inspectable and intervenable. RepoPrompt's role here is design-review (oracle_send mode=review at end of L1 engine work, before push) and code-review (`/rp-review` against the dessin-blocs branch).

## 7. Risks & mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Wrapper script tag with both `src` and inline content (ignored by browsers) | P0 (oracle 1st review) | Use separate config script (§4.7). Documented. |
| 2 | Student creates infinite loop, freezes phone | P1 | AST interpreter with `MAX_COMMANDS=5000`, `EXECUTION_TIMEOUT=3000ms`, abort button. Never `eval`. |
| 3 | Validator too brittle (correct solutions fail) | P1 | Fixed 500×500 mask (not DPR), normalize stroke width, dilate by 4 px. Lenient early, strict later. |
| 4 | MiniCourse iframe clips engine workspace | P1 | Preserve `SET_INSTRUCTION_HEIGHT` postMessage contract. Per-exercise `interactionCode`. |
| 5 | Static `targetShape` insufficient for ex 5/6 | P1 (oracle 1st) | Schema includes `sidesFrom: studentInputs.n` for ex 5; dedicated `kind: rosace` with petal config for ex 6. |
| 6 | Validator DSL stringly-typed (`"n-sides:4"`) → brittle | P1 (oracle 2nd) | Replaced with structured `GeometricCheck` objects (§4.5). |
| 7 | Execution model contradiction (1 cmd/frame vs 3s success) | P1 (oracle 2nd) | `COMMANDS_PER_FRAME = 200` so 5000 cmds finishes in ~0.4s. |
| 8 | L3 BUILDER.md depends on engine outputs (hidden dependency) | P1 (oracle 2nd) | Split L3 into L3a (parallel) + L3b (after L1 sync). Embed-manifest.json is the contract. |
| 9 | Wrapper drift over time (7 files diverge) | P2 | `_build/stamp-wrappers.mjs` regenerates all 7 from JSON + template. Generator + outputs both committed. |
| 10 | URL encoding `9%20grade` mistakes 404 | P2 | Use `%20` consistently. Smoke-test each URL post-push. |
| 11 | Mobile layout cramped | P2 | Toolbox/programme/canvas stack vertically on phone. Sticky Exécuter/Réinitialiser. Prototype before all 7. |
| 12 | Ex 1 over-validated punishes exploration | P2 | Validation `none` for ex 1 and 7. Lenient for 2-3, strict for 4-6. |
| 13 | **25 simultaneous gh-pages loads on school WiFi** | P2 (oracle 2nd) | No library bundles to fetch (vanilla JS, vendored fonts). Teacher preloads launcher before class to warm caches. |
| 14 | Confusion between static PDF and interactive MCG course | P2 (oracle 2nd) | §5.3 documents pipeline explicitly. PDFs are theory-only; iframe embedding happens in MCG. |

## 8. Success criteria — gating table

| Gate | Owner | When | Blocks release? |
|---|---|---|---|
| Engine `/rp-review` passes with 0 P0 findings | L1 | Before push to main | ✅ yes |
| All 7 wrappers load on iOS Safari + Android Chrome + Chrome desktop without console errors | L1 | After push, before MCG embed | ✅ yes |
| Each exercise's "Exécuter" produces drawing within 3s for any programme ≤ 5000 commands | L1 | Local smoke test | ✅ yes |
| All 7 wrappers report correct height via `SET_INSTRUCTION_HEIGHT` | L1 | Manual test in MCG sandbox | ✅ yes |
| All 7 BUILDER.md generate clean PDFs through MiniCourse generator | L1 + teacher | After L3b complete | ✅ yes |
| French content reviewed for age-appropriateness (≤ 3 corrections per file) | L4 Gemini OR teacher | Before classroom rollout | ✅ yes |
| 5-student dry run: ≥ 80% correct solutions pass; ≤ 5% incorrect solutions falsely pass | Teacher | Before evaluative use | ✅ yes |
| Telemetry decision documented | L1 | At spec approval | ✅ done — **No telemetry. Teacher-observed completion only.** |

## 9. Open questions (deferred — not blockers for spec approval)

1. **AST-level enforcement of 360/n in ex 5**: revisit after first classroom trial. If kids consistently bypass via hardcoded angles AND the teacher reports it as a problem, add `requiredConcepts: [{ kind: 'usesDivisionByInput', numerator: 360, input: 'n' }]` to `05-polygones-reguliers.json` and have the validator inspect the programme tree.
2. **Print-friendly fallback in BUILDER.md**: should the static PDF include a screenshot of "expected blocks" for offline practice, or only the iframe HTML? Defaulting to iframe-only for first version.
3. **Save PNG in ex 7**: download to device only (current). Teacher gallery would need a backend, deferred.
4. **Test integration**: when does this slot into a class test? Separate planning session.
5. **Accessibility**: keyboard navigation for build mode, screen-reader labels, color-contrast audit. Address after first classroom trial.
6. **Answer-sharing randomization**: per-student angle/size variation if used evaluatively. Deferred until evaluative use is confirmed.
7. **Starter workspaces for ex 6**: currently empty programme. Could pre-load a `répéter 12 { … }` shell to scaffold harder. Decide after pilot.

## 10. Decision log

- **2026-05-08 ✓**: Standalone unit chosen over Module-4 slot (option 3 in brainstorm).
- **2026-05-08 ✓**: 7-exercise progression with intro + polygones générale (option 2 — pedagogically richer).
- **2026-05-08 ✓**: Ghost-overlay + geometric backstop chosen over pure visual or pure geometric.
- **2026-05-08 ✓**: First architecture pass = Google Blockly + custom turtle blocks. **REVERSED** after user pushback.
- **2026-05-08 ✓**: Final architecture = **Mini Block Builder** (custom ~1500 LOC vanilla JS, no library). Rationale: matches Unit 6 pattern user already validated; ships in 3-4 days not 5-7; no school-WiFi worries.
- **2026-05-08 ✓**: 360/n insight = output-only validation, soften pedagogical claim. AST enforcement deferred.
- **2026-05-08 ✓**: Telemetry = none. Teacher-observed completion.
- **2026-05-08 ✓**: Vendored fonts (no Google Fonts runtime dep).
- **2026-05-08 ✓**: Maestri canvas chosen as orchestrator surface; RepoPrompt for design + code reviews from this thread.
- **2026-05-08 ✓**: L3 split into L3a (parallel) + L3b (after embed-manifest.json sync) per oracle 2nd review.
- **2026-05-08 ✓**: Static PDFs are theory-only; iframe embed happens in MCG (clarified by user).

## 11. Next step

After user approval of this spec, invoke the `superpowers:writing-plans` skill to turn §6 (orchestration) and §4 (architecture) into a step-by-step implementation plan with checkpoints.
