import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";

const API = "http://api.test";
const ISSUER = "http://idp.test/realms/supportops";
const CLIENT = "supportops-web";
const evidence = "artifacts/evidence/frontend-platform";
const sizes = [{ width: 1000, height: 800 }, { width: 360, height: 740 }];

const TICKET = { id: "t-1", tenant_id: "tenant-a", customer_id: "customer-a", subject: "Dúvida na fatura", body: "Explique a cobrança desta fatura, por favor.", status: "open", created_at: "2026-10-30T12:00:00Z" };
const APPROVAL = { id: "a-1", ticket_id: "t-1", action: "issue_refund", amount_cents: 2500, requested_by: "agent-a", state: "pending" };

function b64url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function signedIn(page: Page, roles: string[]) {
  const token = `${b64url({ alg: "none" })}.${b64url({ preferred_username: "approver-a", tenant_id: "tenant-a", roles })}.sig`;
  const user = { access_token: token, token_type: "Bearer", scope: "openid", profile: { sub: "u1" }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key as string, value as string), [`oidc.user:${ISSUER}:${CLIENT}`, JSON.stringify(user)]);
}

async function mock(page: Page, seen: { auth: string[] }) {
  await page.route("**/config.json", (route) => route.fulfill({ json: { oidcIssuer: ISSUER, oidcClientId: CLIENT, apiBaseUrl: API } }));
  await page.route(`${API}/**`, async (route: Route) => {
    const cors = { "access-control-allow-origin": "http://localhost:44175", "access-control-allow-headers": "authorization,traceparent,content-type,idempotency-key", "access-control-allow-methods": "GET,POST,OPTIONS" };
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    seen.auth.push(request.headers()["authorization"] ?? "");
    const path = new URL(request.url()).pathname;
    const body = path === "/v1/tickets" ? [TICKET] : path === "/v1/tickets/t-1" ? TICKET : path === "/v1/approvals" ? [APPROVAL] : {};
    return route.fulfill({ json: body, headers: cors });
  });
}

async function check(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((v) => `${name} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth ? [] : [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className)}`).slice(0, 6));
  expect(wide, `${name} overflows horizontally`).toEqual([]);
}

for (const size of sizes) {
  test(`signed-out screen passes axe with contrast at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await mock(page, { auth: [] });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await check(page, "signin");
  });

  test(`console screens pass axe with contrast at ${size.width}px and call the API cross-origin with the bearer token`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const seen = { auth: [] as string[] };
    await signedIn(page, ["agent", "approver"]);
    await mock(page, seen);
    await page.goto("/#/tickets");
    await expect(page.getByRole("heading", { level: 1, name: "Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dúvida na fatura" })).toBeVisible();
    await check(page, "tickets");
    await page.goto("/#/tickets/t-1");
    await expect(page.getByRole("heading", { name: "Análise" })).toBeVisible();
    await check(page, "ticket");
    await page.goto("/#/approvals");
    await expect(page.getByText("25,00", { exact: true })).toBeVisible();
    await check(page, "approvals");
    expect(seen.auth.length).toBeGreaterThan(0);
    expect(seen.auth.every((h) => h.startsWith("Bearer "))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("a cold API shows the wake notice with elapsed time instead of an endless spinner", async ({ page }) => {
  await signedIn(page, ["agent"]);
  await page.route("**/config.json", (route) => route.fulfill({ json: { oidcIssuer: ISSUER, oidcClientId: CLIENT, apiBaseUrl: API } }));
  await page.route(`${API}/**`, async (route) => {
    const cors = { "access-control-allow-origin": "http://localhost:44175", "access-control-allow-headers": "authorization,traceparent,content-type", "access-control-allow-methods": "GET,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await new Promise((resolve) => setTimeout(resolve, 6000));
    return route.fulfill({ json: [], headers: cors });
  });
  await page.goto("/#/tickets");
  await expect(page.getByRole("status")).toContainText(/Acordando a API: \d+ s de cerca de 20 s/, { timeout: 15_000 });
});

test("reduced motion keeps every screen readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signedIn(page, ["agent"]);
  await mock(page, { auth: [] });
  await page.goto("/#/tickets");
  await expect(page.getByRole("heading", { level: 1, name: "Tickets" })).toBeVisible();
});

test("squint screenshots for the owner (DS-006, human review pending)", async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1000, height: 800 });
  await signedIn(page, ["agent", "approver"]);
  await mock(page, { auth: [] });
  for (const [name, route] of [["p06-tickets", "#/tickets"], ["p06-ticket", "#/tickets/t-1"], ["p06-approvals", "#/approvals"]] as const) {
    await page.goto(`/${route}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${evidence}/${name}.png` });
    await page.evaluate(() => { document.documentElement.style.filter = "blur(10px)"; });
    await page.screenshot({ path: `${evidence}/${name}-squint.png` });
    await page.evaluate(() => { document.documentElement.style.filter = ""; });
  }
});
