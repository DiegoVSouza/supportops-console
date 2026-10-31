# Specification — phase 003, design system and Pages readiness

Lab context: `docs/harness/frontend-platform/` and `docs/decisions/ADR-001-frontend-on-cloudflare-pages.md` in the lab root.

## Behaviour

- Same screens and flows as phase 001 and 002, now drawn with `colagem-ui` (level 0): cut cards with hard shadow, glyph-plus-word seals, panels, data table, toast, cut-out-letter logo.
- `config.json` may carry `apiBaseUrl`. Present: the console calls that origin directly. Absent: it keeps calling same-origin `/api` (nginx image, local stack).
- A slow API or identity server shows a wake notice with elapsed seconds, not an endless spinner.
- `npm run build:pages` writes `dist/config.json` and `dist/_headers` from `P05_API_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`. It refuses http, missing values and wildcards.

## Contract

| Requirement | Rule |
| --- | --- |
| DS-001 | No color literal or `border-radius` in `src/`; the pinned tarball hash is checked. |
| DS-003 | Status is glyph plus word (`Seal`). |
| FE-001 | The static build needs only `config.json` at runtime; no secret. |
| FE-002 | CSP `connect-src` and `frame-src` name exactly the API and identity origins. Browser test calls the mocked API cross-origin and checks the bearer header. |
| FE-003 | Cold API shows the wake notice (browser test with a 6 s delayed API). |
| A11Y-001 | axe with contrast: sign-in, tickets, ticket, approvals at 1000 px and 360 px. |
| PERF-001 | Initial JS ≤ 120 KB gzip. |

## Out of scope

P05 CORS and the Keycloak client origins (lab phase F4), any deploy, the real-stack e2e rerun.
