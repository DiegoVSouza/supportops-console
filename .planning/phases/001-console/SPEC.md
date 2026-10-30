# Specification

SupportOps Console: the browser interface to the P05 API, for support agents and refund approvers.

## Behaviour

- Sign in through Keycloak with Authorization Code + PKCE, sign out, renew silently. No password touches the console.
- Agent: list and create tickets, open one, run triage as a durable task and see decision, citations and result, request a refund, send feedback.
- Approver: see pending approvals with amount and requester, approve or reject. A rejected or conflicting decision shows the server's reason.
- Tenant boundary, separation of duties and scopes stay enforced by P05. The UI hides actions a role cannot take, and never treats that as security.

## Engineering contract

| Requirement | Rule |
| --- | --- |
| API-001 | `contract/p05-openapi.json` is a pinned copy of P05's `openapi.yaml`; `src/api/schema.d.ts` is generated. `npm run contract:check` fails on drift from P05 or a stale client. |
| SEC-001 | Same-origin `/api` proxy, strict CSP, no inline script, no third-party origin at runtime. |
| A11Y-001 | axe has zero violations on every screen, in unit tests and against the real stack. Keyboard path covers the full flow. |
| PERF-001 | Initial JS at most 120 KB gzip, checked by `npm run budget`. Design system level 0 asks for 100 KB; the extra 20 KB is `oidc-client-ts`, recorded in `decisions.md`. |
| OBS-001 | nginx writes JSON access logs. `/healthz` is liveness, `/readyz` proves P05 is reachable. |

Theme: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, level 0, tema Breu, red preset, self-hosted fonts.

## Out of scope

P05 business rules, 3D scene, a kit `web-saas` profile, real deploy.
