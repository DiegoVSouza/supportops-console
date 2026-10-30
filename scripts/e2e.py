#!/usr/bin/env python3
"""Run the browser e2e against the root stack; passwords stay in process memory."""
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
LAB = ROOT.parents[1]
NAMES = {"agent-a": "E2E_AGENT_A_PASSWORD", "agent-b": "E2E_AGENT_B_PASSWORD", "approver-a": "E2E_APPROVER_A_PASSWORD"}

output = subprocess.run([sys.executable, "scripts/stack.py", "credentials"], cwd=LAB, capture_output=True, text=True)
if output.returncode:
    print("e2e: FAIL could not read local credentials; run python scripts/stack.py up first")
    sys.exit(1)
env = dict(os.environ)
for line in output.stdout.splitlines():
    label, _, value = line.partition(": ")
    if label in NAMES:
        env[NAMES[label]] = value
if any(name not in env for name in NAMES.values()):
    print("e2e: FAIL credentials output changed")
    sys.exit(1)
sys.exit(subprocess.run([shutil.which("npx") or "npx", "playwright", "test", *sys.argv[1:]], cwd=ROOT, env=env).returncode)
