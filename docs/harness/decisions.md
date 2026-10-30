# Intake decisions — P06 SupportOps Console

- Product: browser console for P05, for support agents and refund approvers. See `.planning/phases/001-console/SPEC.md`.
- Profile: `workflow-automation` with `has_agent: false`, the closest kit profile. The agent and its trifecta stay owned by P05. The console renders tenant data, so `multi_tenant` and `sensitive_data` are true. Discovery: lab `docs/harness/adaptation-discovery.md`.
- No `web-saas` kit profile: lab rule 3 needs two real projects, and this is the first.
- Contract: pinned copy of P05's `openapi.yaml`; `src/api/schema.d.ts` is generated. Endpoints come from the contract only.
- Budget: 120 KB gzip initial JS. Level 0 of the design system suggests 100 KB; `oidc-client-ts` accounts for the difference.
- Tokens stay in `sessionStorage`, so a reload keeps the session. The CSP forbids inline and third-party script, and access tokens live five minutes.
- Fonts are self-hosted through Fontsource, so no third-party origin is contacted at runtime.
- API runs same-origin through nginx, so P05 gains no CORS surface.
