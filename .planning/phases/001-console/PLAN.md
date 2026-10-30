# Plan

1. Contract and tooling: pin the OpenAPI copy, generate the client, lint, typecheck, unit tests, budget check, real `check_fast.py` and `check_full.py`.
2. Application: tokens and components, auth, tickets, ticket detail, approvals, with unit and axe tests.
3. Container: Dockerfile, nginx template with runtime config, CSP and health endpoints.
4. Integration: root Compose and Fly service behind the same up/down commands, Keycloak public client, Playwright e2e and axe against the real stack. Root changes run in lab-stack phase 004.

allowed_write_paths: `projects/p06/**`.

forbidden_changes: P05 business logic, `harness-kit/`, secrets or passwords in the repository or evidence, endpoints absent from the contract, third-party runtime origins, removing or weakening a test to pass.

llm_mode: fake. budget: USD 0. validation: `python scripts/check_full.py` plus the e2e run recorded in VERIFY.md.

stop conditions: three failed attempts on one failure, or a change that needs a real deploy.
