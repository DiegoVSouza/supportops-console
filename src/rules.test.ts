import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apiBase } from "./config";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("design system adoption (DS-001)", () => {
  it("no color literal, color function or rounded corner in this repository's own sources", () => {
    const files = walk(join(root, "src")).filter((f) => /\.(css|tsx?)$/.test(f) && !/\.test\.|schema\.d\.ts/.test(f));
    for (const f of files) {
      const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/href="#[^"]*"/g, "").replace(/`#\/[^`]*`/g, "");
      expect(/#[0-9a-fA-F]{3,8}\b/.test(text), `${f} has a color literal`).toBe(false);
      expect(/\b(rgb|rgba|hsl|hsla)\(/.test(text), `${f} uses a color function`).toBe(false);
      expect(/border-radius/.test(text), `${f} rounds a corner`).toBe(false);
    }
  });

  it("the vendored colagem-ui tarball matches the pinned SHA-256", () => {
    const lock = JSON.parse(readFileSync(join(root, "docs/harness/sources.lock.json"), "utf8"))["colagem-ui"];
    const sha = createHash("sha256").update(readFileSync(join(root, lock.tarball))).digest("hex");
    expect(sha).toBe(lock.sha256);
  });
});

describe("API base (FE-002)", () => {
  it("defaults to the same-origin proxy used by the nginx image", () => {
    expect(apiBase({ oidcIssuer: "x", oidcClientId: "y" }, "https://console.test")).toBe("https://console.test/api");
  });

  it("uses the configured Fly API origin on Cloudflare Pages", () => {
    expect(apiBase({ oidcIssuer: "x", oidcClientId: "y", apiBaseUrl: "https://supportops-lab-p05.fly.dev/" }, "https://console.pages.dev")).toBe("https://supportops-lab-p05.fly.dev");
  });
});
