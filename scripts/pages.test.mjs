import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderConfig, renderHeaders } from "./pages.mjs";

const env = {
  P05_API_URL: "https://supportops-lab-p05.fly.dev/",
  OIDC_ISSUER: "https://supportops-lab-idp.fly.dev/realms/supportops",
  OIDC_CLIENT_ID: "supportops-web",
};
const template = readFileSync(join(process.cwd(), "pages/_headers.template"), "utf8");

describe("Cloudflare Pages output (FE-001, FE-002)", () => {
  it("config carries the API origin and the issuer without a trailing slash", () => {
    const { config } = renderConfig(env);
    expect(config).toEqual({
      oidcIssuer: "https://supportops-lab-idp.fly.dev/realms/supportops",
      oidcClientId: "supportops-web",
      apiBaseUrl: "https://supportops-lab-p05.fly.dev",
    });
  });

  it("CSP names exactly the API and identity origins and no wildcard", () => {
    const headers = renderHeaders(template, renderConfig(env));
    const csp = /Content-Security-Policy: (.*)/.exec(headers)?.[1] ?? "";
    expect(csp).toContain("connect-src 'self' https://supportops-lab-p05.fly.dev https://supportops-lab-idp.fly.dev;");
    expect(csp).toContain("frame-src https://supportops-lab-idp.fly.dev;");
    expect(csp).not.toMatch(/\*|unsafe-inline|unsafe-eval/);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("refuses http, missing values and wildcards", () => {
    expect(() => renderConfig({ ...env, P05_API_URL: "http://api.test" })).toThrow(/https/);
    expect(() => renderConfig({ ...env, OIDC_CLIENT_ID: "" })).toThrow(/OIDC_CLIENT_ID/);
    expect(() => renderConfig({ ...env, P05_API_URL: "" })).toThrow(/required/);
    expect(() => renderHeaders("connect-src 'self' *;", { apiOrigin: "https://a", oidcOrigin: "https://b" })).toThrow(/wildcard/);
  });

  it("config.json is never cached", () => {
    expect(template).toMatch(/\/config\.json\n\s+Cache-Control: no-store/);
  });
});
