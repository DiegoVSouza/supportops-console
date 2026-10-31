// Cloudflare Pages output: dist/config.json and dist/_headers from environment values (FE-001, FE-002).
// No secrets are involved: these are public origins. Usage: node scripts/pages.mjs build
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function origin(name, value) {
  if (!value) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${name} must be https, got ${value}`);
  if (url.hostname.includes("*")) throw new Error(`${name} must not contain a wildcard`);
  return url.origin;
}

export function renderConfig(env) {
  const apiOrigin = origin("P05_API_URL", env.P05_API_URL);
  const issuer = new URL(env.OIDC_ISSUER ?? "");
  const oidcOrigin = origin("OIDC_ISSUER", issuer.origin);
  if (!env.OIDC_CLIENT_ID) throw new Error("OIDC_CLIENT_ID is required");
  return {
    config: { oidcIssuer: issuer.href.replace(/\/$/, ""), oidcClientId: env.OIDC_CLIENT_ID, apiBaseUrl: apiOrigin },
    apiOrigin,
    oidcOrigin,
  };
}

export function renderHeaders(template, { apiOrigin, oidcOrigin }) {
  const text = template.replaceAll("${API_ORIGIN}", apiOrigin).replaceAll("${OIDC_ORIGIN}", oidcOrigin);
  if (/\$\{/.test(text)) throw new Error("unresolved placeholder in _headers");
  if (/connect-src[^;\n]*\*/.test(text)) throw new Error("connect-src must not contain a wildcard");
  return text;
}

if (process.argv[2] === "build") {
  const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const { config, apiOrigin, oidcOrigin } = renderConfig(process.env);
  writeFileSync(join(root, "dist/config.json"), JSON.stringify(config) + "\n");
  const template = readFileSync(join(root, "pages/_headers.template"), "utf8");
  writeFileSync(join(root, "dist/_headers"), renderHeaders(template, { apiOrigin, oidcOrigin }));
  console.log(`pages: dist/config.json and dist/_headers written for api=${apiOrigin} idp=${oidcOrigin}`);
}
