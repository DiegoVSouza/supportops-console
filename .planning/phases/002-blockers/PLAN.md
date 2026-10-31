# Plan

1. Copy the contract and regenerate the client.
2. Lift the followed task to `TicketPage`, and connect the refund form to it.
3. Add unit tests and an e2e that proves the requested amount reaches the effect.

allowed_write_paths: `contract/**`, `src/**`, `e2e/**`, `docs/harness/**`, `.planning/phases/002-blockers/**`, `artifacts/evidence/blockers-002/**`.

forbidden_changes: endpoints absent from the contract, removing or weakening a test.

llm_mode: fake. budget: USD 0. validation: `python scripts/check_full.py`, `python scripts/e2e.py`, `python scripts/e2e_fly.py`. stop conditions: three failed attempts on one failure.
