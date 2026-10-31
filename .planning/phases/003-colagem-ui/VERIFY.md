# Verification — phase 003

PASS (local, offline browser) — 2026-10-31. Not deployed. Real-stack e2e not rerun.

| Command (cwd: projects/p06) | Exit | Evidence (`artifacts/evidence/frontend-platform/`) |
| --- | --- | --- |
| `python scripts/check_full.py`, final | 0: 30 unit tests (22 existing pass unchanged), lint, types, contract, build, budget 92.0 KB gzip of 120 KB, 7 offline Playwright tests (axe with contrast, cross-origin API with bearer, wake notice, reduced motion, squint screenshots), Docker image build | `p06-check-full.txt`, `p06-offline-e2e.txt`, `p06-*.png` |
| `npm run build:pages` with the Fly origins | 0: `dist/config.json`, `dist/_headers` with exact origins | printed in the session; unit-tested in `scripts/pages.test.mjs` |

Defects and findings:

1. The first `check_full.py` run failed at the Docker image step because Docker Desktop was not running. It was started, and the rerun passed, which also proves `COPY vendor` in the Dockerfile.
2. My first browser selector matched two cells (the amount and the button cell). In the 360 px layout the table adds the column label to a cell's accessible name (`Valor: 25,00`), so the test selects the text instead.
3. Pre-existing uncommitted work in this repository (waiting for the identity server to wake) was committed separately as `3e8fe12` before this phase, after its own tests passed.

Not covered: the real-stack e2e (`python scripts/e2e.py`) was not rerun on the new DOM and may need selector updates; silent renewal past the token lifetime; a screen reader run by a person; the owner's squint judgement (`review_mode=human_pending`); any public URL.
