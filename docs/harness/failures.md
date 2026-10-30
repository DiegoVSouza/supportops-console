# Failures

Record recurring builder or product failures here before fixing them.

## 2026-10-30 — Triage failed with worker_failure from the console

The worker runs on the caller's scopes, and its MCP lookups need `billing:read` and `crm:read`. The console requested neither. Scope lists now match `AGENT_SCOPES` in `ops/stack/tools.py`. When adding a worker tool, add its scope to `src/auth.ts` and `ops/stack/idp_clients.py`.
