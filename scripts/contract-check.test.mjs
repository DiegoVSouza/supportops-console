import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const here = process.cwd();
const scratch = [];

function copyOfProject() {
  const dir = mkdtempSync(join(tmpdir(), "p06-contract-test-"));
  scratch.push(dir);
  mkdirSync(join(dir, "contract"), { recursive: true });
  mkdirSync(join(dir, "src/api"), { recursive: true });
  cpSync(join(here, "contract/p05-openapi.json"), join(dir, "contract/p05-openapi.json"));
  cpSync(join(here, "src/api/schema.d.ts"), join(dir, "src/api/schema.d.ts"));
  return dir;
}

function check(root) {
  return spawnSync(process.execPath, [join(here, "scripts/contract-check.mjs")], {
    env: { ...process.env, P06_CONTRACT_ROOT: root, P05_OPENAPI: join(root, "missing.yaml") },
    encoding: "utf8",
  });
}

afterEach(() => {
  while (scratch.length) rmSync(scratch.pop(), { recursive: true, force: true });
});

describe("contract:check", () => {
  it("passes on LF files", () => {
    const dir = copyOfProject();
    const toLf = (path) => writeFileSync(path, readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
    toLf(join(dir, "contract/p05-openapi.json"));
    toLf(join(dir, "src/api/schema.d.ts"));
    expect(check(dir).status).toBe(0);
  });

  it("passes when a Windows checkout turned every file into CRLF", () => {
    const dir = copyOfProject();
    const toCrlf = (path) => writeFileSync(path, readFileSync(path, "utf8").replace(/\r?\n/g, "\r\n"));
    toCrlf(join(dir, "contract/p05-openapi.json"));
    toCrlf(join(dir, "src/api/schema.d.ts"));
    expect(check(dir).status).toBe(0);
  });

  it("still fails when the generated client is stale", () => {
    const dir = copyOfProject();
    const path = join(dir, "src/api/schema.d.ts");
    writeFileSync(path, readFileSync(path, "utf8") + "\nexport type Stale = never;\n");
    const result = check(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stale");
  });
});
