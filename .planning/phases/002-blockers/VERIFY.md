# Verification

PASS — 2026-10-31. Fly result in lab-stack phase 008.

| Command (cwd: projects/p06) | Exit | Evidence (`artifacts/evidence/blockers-002/`) |
| --- | --- | --- |
| `python scripts/check_full.py` | 0, 20 tests, budget 89.7 KB of 120 | `check-full-attempt1.txt`, `check-full-attempt2.txt` |
| `python scripts/e2e.py`, attempt 1 | 1, manual refund ended `worker_failure` in P05 | `e2e-attempt1.txt` |
| `python scripts/e2e.py`, attempt 2, after the P05 fix | 0, 3 passed | `e2e-attempt2.txt` |
| `E2E_RENEWAL=1 python scripts/e2e.py` | 0, 4 passed, including token renewal | `e2e-renewal.txt` |
| `python scripts/e2e_fly.py` | 0, 3 passed | lab `artifacts/evidence/lab-stack/remaining-readiness-008/e2e-fly.txt` |
