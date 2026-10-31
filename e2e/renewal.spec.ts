import { expect, test } from "@playwright/test";

// Waits out the five-minute token, so it only runs when asked for.
test("the session renews itself before the access token expires", async ({ browser }) => {
  test.skip(!process.env.E2E_RENEWAL, "set E2E_RENEWAL=1 to run this five-minute check");
  test.setTimeout(420_000);
  const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.locator("#username").fill("agent-a");
  await page.locator("#password").fill(process.env.E2E_AGENT_A_PASSWORD ?? "");
  await page.locator("#kc-login").click();
  await expect(page.getByRole("heading", { level: 1, name: "Tickets" })).toBeVisible();
  const token = () => page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((name) => name.startsWith("oidc.user:"));
    return key ? (JSON.parse(sessionStorage.getItem(key) ?? "{}") as { access_token?: string }).access_token : undefined;
  });
  const first = await token();
  expect(first).toBeTruthy();
  await expect.poll(token, { timeout: 330_000, intervals: [5_000] }).not.toBe(first);
  await page.evaluate(() => { window.location.hash = "#/tickets/renewal-check"; });
  await expect(page.getByRole("alert")).toContainText("ticket not found");
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});
