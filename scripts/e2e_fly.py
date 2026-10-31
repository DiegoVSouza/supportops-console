#!/usr/bin/env python3
"""Run the browser e2e against the deployed console; passwords stay in process memory."""
import json
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SECRETS = ROOT.parents[1]/"artifacts/checkpoints/pre-fly-final-20261023/fly-secrets.json"

values = json.loads(SECRETS.read_text(encoding="utf-8-sig"))
env = {**os.environ, "CONSOLE_URL": "https://supportops-lab-web.fly.dev",
       "E2E_AGENT_A_PASSWORD": values["AGENT_A_PASSWORD"],
       "E2E_AGENT_B_PASSWORD": values["AGENT_B_PASSWORD"],
       "E2E_APPROVER_A_PASSWORD": values["APPROVER_PASSWORD"]}
sys.exit(subprocess.run([shutil.which("npx") or "npx", "playwright", "test", *sys.argv[1:]], cwd=ROOT, env=env).returncode)
