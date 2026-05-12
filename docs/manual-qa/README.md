# Manual QA — dessin-blocs

This folder holds **manual-QA artifacts** for the Atelier Dessin par Blocs unit. They are not part of an automated visual-regression harness; they're a human reference.

## Baselines

- `baseline-2026-05-12/` — captured immediately after the oracle-driven P0/P1 fixes (commit `a8029b3`). Use as the "looks correct" reference until a new baseline is captured.

When capturing a new baseline:

1. Visit each of the 7 exercises on `https://johnbub.github.io/games-for-minicourse/9%20grade/dessin-blocs/0N-*.html`
2. Drive a canonical interaction (Exécuter on default; for step mode, tap a square sequence)
3. Save the screenshot to `docs/manual-qa/baseline-YYYY-MM-DD/exN.png`
4. Commit the new baseline folder in one commit; archive or delete older baselines.

Ad-hoc screenshots produced during Chrome-MCP runs land in `9 grade/dessin-blocs/tests/smoke-*.png` and are git-ignored.
