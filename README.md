# SupportOps Console

Browser console for the P05 support platform. Agents create tickets, run triage and request refunds. Approvers see each pending refund with its amount and requester, then decide. Sign-in is Keycloak Authorization Code with PKCE.

## Run it

The console runs as the `web` service of the root stack:

```powershell
python scripts/stack.py up      # from the lab root
```

Open http://localhost:48080. `python scripts/stack.py credentials` prints the local account passwords. Keycloak uses a local CA, so accept the certificate warning on first sign-in or trust the CA from `python scripts/stack.py ca`.

| Account | Role |
| --- | --- |
| `agent-a`, `agent-b` | Support agent in `tenant-a`, `tenant-b` |
| `approver-a` | Refund approver in `tenant-a` |

A ticket that mentions "refund" makes triage propose a refund and wait for an approver. P05 refuses to let a requester approve their own refund.

## Develop

```powershell
npm ci
npm run dev              # Vite; proxy /api and /config.json yourself or use the stack
python scripts/check_fast.py    # lint, types, contract, unit and axe tests
python scripts/check_full.py    # plus production build, bundle budget, image
python scripts/e2e.py           # Playwright and axe against the running stack
```

## API contract

`contract/p05-openapi.json` is a pinned copy of `projects/p05/openapi.yaml`, and `src/api/schema.d.ts` is generated from it. `npm run contract:check` fails when P05 changes or the client is stale. To adopt a change, copy the file, run `npm run contract:gen`, and let the compiler show the affected callers.

## Runtime configuration

The same image runs locally and on Fly. nginx renders these at start:

| Variable | Meaning |
| --- | --- |
| `P05_API_URL` | P05 base URL, proxied at `/api/` so the browser stays same-origin |
| `OIDC_ISSUER` | Keycloak realm URL |
| `OIDC_ORIGIN` | Keycloak origin, allowed in the CSP |
| `OIDC_CLIENT_ID` | Public client, applied by `ops/stack/idp_clients.py` |

`/healthz` answers liveness. `/readyz` passes P05 readiness through, so it fails when P05, PostgreSQL or Redis is down. Access logs are JSON on stdout. Port 8081 serves `stub_status` for the metrics exporter and is not published. Each API call sends a W3C `traceparent`, so traces start in the browser.

## Results

Initial JavaScript is enforced at 120 KB gzip by `npm run budget`. Measured runs are in `artifacts/evidence/console-001/`.
