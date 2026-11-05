# Plan

1. Reconcile the intake hosting decision with README, progress and saved Fly acceptance.
2. Run local fast/full checks and save output; do not repeat public E2E or deployment.

allowed_write_paths: `.planning/phases/004-hosting-decision/**`, `docs/harness/decisions.md`, `docs/harness/progress.md`, `artifacts/evidence/hosting-decision-004/**`.

forbidden_changes: runtime, other projects, external effects and preexisting evidence. llm_mode: fake; budget: USD 0; max_tries: 3. Stop on unavailable local runtime or three failed checks.
