// Fails when the pinned contract drifted from P05 or the generated client is stale.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pinned = join(root, "contract/p05-openapi.json");
const upstream = process.env.P05_OPENAPI ?? join(root, "../p05/openapi.yaml");
const generated = join(root, "src/api/schema.d.ts");

const contract = JSON.parse(readFileSync(pinned, "utf8"));
if (contract.openapi !== "3.1.0" || !contract.paths["/v1/approvals"]) {
  console.error("contract: the pinned file is not the expected P05 contract; copy projects/p05/openapi.yaml again");
  process.exit(1);
}
if (existsSync(upstream)) {
  if (readFileSync(upstream, "utf8") !== readFileSync(pinned, "utf8")) {
    console.error("contract: P05 changed; copy its openapi.yaml to contract/p05-openapi.json, run npm run contract:gen, and fix the callers");
    process.exit(1);
  }
} else {
  console.log("contract: P05 checkout absent, checked the pinned copy only");
}
const scratch = mkdtempSync(join(tmpdir(), "p06-contract-"));
try {
  const output = join(scratch, "schema.d.ts");
  const cli = join(root, "node_modules/openapi-typescript/bin/cli.js");
  execFileSync(process.execPath, [cli, pinned, "-o", output], { stdio: "pipe" });
  if (readFileSync(output, "utf8") !== readFileSync(generated, "utf8")) {
    console.error("contract: src/api/schema.d.ts is stale; run npm run contract:gen");
    process.exit(1);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log(`contract: PASS (P05 ${contract.info.version})`);
