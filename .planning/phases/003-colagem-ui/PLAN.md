# Plan — phase 003

1. Pin `colagem-ui` 0.3.0 (tarball in `vendor/`, hash in `docs/harness/sources.lock.json`, `COPY vendor` in the Dockerfile before `npm ci`).
2. Replace local tokens and CSS with the package; keep layout-only `console.css`.
3. Port the pages to components, keeping every label and role the unit and e2e tests use.
4. `apiBase` and `config.json.apiBaseUrl`; `Loading` and wake notice.
5. `scripts/pages.mjs`, `pages/_headers.template`, tests.
6. Offline browser e2e (`playwright.offline.config.ts`, `e2e-offline/`) with the API and IdP mocked; wire into `check_full.py`.

allowed_write_paths: `projects/p06/**`.

forbidden_changes: P05, `harness-kit/`, a hex outside tokens, third-party runtime origin, secrets, deploy, weakening a test.

llm_mode: fake. budget: USD 0. validation: `python scripts/check_full.py`.
