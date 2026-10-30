# Verification

PASS — 2026-10-30, local stack scope. Real Fly deploy not run.

| Command (cwd: projects/p06) | Exit | Evidence (`artifacts/evidence/console-001/`) |
| --- | --- | --- |
| `python scripts/check_full.py`, attempt 1 | 0 | `check-full-attempt1.txt` |
| `python scripts/e2e.py`, attempt 1 | 1 | `e2e-attempt1.txt` |
| `python scripts/e2e.py`, attempt 2 | 0 | `e2e-attempt2.txt` |
| `python scripts/check_full.py`, attempt 2, new `e2e/screens.mjs` not in lint globals | 1 | `check-full-attempt2.txt` |
| `python scripts/e2e.py`, after layout changes | 0, 2 passed | `e2e-attempt3.txt` |
| `python scripts/check_full.py`, attempt 3 | 0, 18 passed (18); budget 89.6 KB gzip of 120 KB | `check-full-attempt3.txt` |

E2e attempt 1 found a real defect: the console did not request `billing:read` and `crm:read`, the worker's MCP lookups need them, and the task ended `worker_failure`. The UI displayed that failure correctly. Fixed in `src/auth.ts` and `ops/stack/idp_clients.py`.

The e2e runs in real Chrome against the real stack: agent signs in with PKCE through Keycloak, creates a ticket, triage pauses for approval, a separate approver sees 25,00 and approves after confirmation, the task finishes with the simulated refund, `agent-b` cannot see the ticket and gets "ticket not found", sign-out returns to the sign-in screen, no CSP violation is logged, and axe (including contrast) reports zero violations on sign-in, tickets, ticket detail, approvals and at 360 px.

Not covered: screen reader run by a person, silent renewal past the five-minute token lifetime in a browser, P05 full service gate on 0.4.4 (`scripts/check_services.py`).
