// Fails when the pinned contract drifted from P05 or the generated client is stale.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const installRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// P06_CONTRACT_ROOT lets the test point the check at a scratch copy; the CLI always comes from this install.
const root = process.env.P06_CONTRACT_ROOT ?? installRoot;
const pinned = join(root, "contract/p05-openapi.json");
const upstream = process.env.P05_OPENAPI ?? join(root, "../p05/openapi.yaml");
const generated = join(root, "src/api/schema.d.ts");
// Git on Windows may check files out with CRLF. Line endings are not drift, content is.
const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const contract = JSON.parse(read(pinned));
if (contract.openapi !== "3.1.0" || !contract.paths["/v1/approvals"]) {
  console.error("contract: the pinned file is not the expected P05 contract; copy projects/p05/openapi.yaml again");
  process.exit(1);
}
if (existsSync(upstream)) {
  if (read(upstream) !== read(pinned)) {
    console.error("contract: P05 changed; copy its openapi.yaml to contract/p05-openapi.json, run npm run contract:gen, and fix the callers");
    process.exit(1);
  }
} else {
  console.log("contract: P05 checkout absent, checked the pinned copy only");
}
const scratch = mkdtempSync(join(tmpdir(), "p06-contract-"));
try {
  const output = join(scratch, "schema.d.ts");
  const cli = join(installRoot, "node_modules/openapi-typescript/bin/cli.js");
  execFileSync(process.execPath, [cli, pinned, "-o", output], { stdio: "pipe" });
  if (read(output) !== read(generated)) {
    console.error("contract: src/api/schema.d.ts is stale; run npm run contract:gen");
    process.exit(1);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log(`contract: PASS (P05 ${contract.info.version})`);
