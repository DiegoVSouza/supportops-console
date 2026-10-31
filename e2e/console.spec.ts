import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required; see README for how the e2e run reads credentials`);
  return value;
};

async function signIn(page: Page, username: string, secret: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(secret);
  await page.locator("#kc-login").click();
  await expect(page.getByRole("heading", { level: 1, name: "Tickets" })).toBeVisible();
}

async function expectNoViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`)).toEqual([]);
}

test("agent and approver complete a refund, and tenants stay apart", async ({ browser }) => {
  const stamp = Date.now();
  const subject = `E2E refund invoice ${stamp}`;
  const agent = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  const cspErrors: string[] = [];
  agent.on("console", (message) => { if (/Content.Security.Policy/i.test(message.text())) cspErrors.push(message.text()); });
  await agent.goto("/");
  await expect(agent.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expectNoViolations(agent);
  await signIn(agent, "agent-a", password("E2E_AGENT_A_PASSWORD"));
  await expectNoViolations(agent);
  await expect(agent.getByRole("link", { name: "Aprovações" })).toHaveCount(0);

  await agent.getByLabel("Cliente").fill("customer-a");
  await agent.getByLabel("Assunto").fill(subject);
  await agent.getByLabel("Descrição").fill("Please review my invoice refund.");
  await agent.getByRole("button", { name: "Criar ticket" }).click();
  await agent.getByRole("link", { name: subject }).click();
  await expect(agent.getByRole("heading", { level: 1, name: subject })).toBeVisible();
  const ticketUrl = agent.url();
  await agent.getByRole("button", { name: "Analisar ticket" }).click();
  await expect(agent.getByText("aguarda aprovação")).toBeVisible({ timeout: 60_000 });
  await expectNoViolations(agent);

  const approver = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await signIn(approver, "approver-a", password("E2E_APPROVER_A_PASSWORD"));
  await approver.getByRole("link", { name: "Aprovações" }).click();
  await expect(approver.getByRole("heading", { level: 1, name: "Aprovações" })).toBeVisible();
  await expect(approver.getByRole("button", { name: /Aprovar reembolso de 25,00/ }).first()).toBeVisible();
  await expectNoViolations(approver);
  const row = approver.getByRole("row").filter({ hasText: "agent-a" }).last();
  await row.getByRole("button", { name: /Aprovar reembolso/ }).click();
  await row.getByRole("button", { name: /Confirmar aprovação/ }).click();
  await expect(approver.getByRole("status")).toContainText("Reembolso aprovado");

  await agent.reload();
  await expect(agent.getByText("Reembolso simulado registrado")).toBeVisible({ timeout: 60_000 });

  const foreign = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await signIn(foreign, "agent-b", password("E2E_AGENT_B_PASSWORD"));
  await expect(foreign.getByRole("link", { name: subject })).toHaveCount(0);
  await foreign.goto(ticketUrl);
  await expect(foreign.getByRole("alert")).toContainText("ticket not found");
  await foreign.getByRole("button", { name: "Sair" }).click();
  await expect(foreign.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(cspErrors).toEqual([]);
});

test("a manual refund runs after approval, with the requested amount", async ({ browser }) => {
  const stamp = Date.now();
  const cents = 1000 + (stamp % 3999);
  const amount = (cents / 100).toFixed(2).replace(".", ",");
  const subject = `E2E manual ${stamp}`;
  const agent = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await signIn(agent, "agent-a", password("E2E_AGENT_A_PASSWORD"));
  await agent.getByLabel("Cliente").fill("customer-a");
  await agent.getByLabel("Assunto").fill(subject);
  await agent.getByLabel("Descrição").fill("Customer asked for a goodwill credit.");
  await agent.getByRole("button", { name: "Criar ticket" }).click();
  await agent.getByRole("link", { name: subject }).click();
  await agent.getByLabel(/Valor em centavos/).fill(String(cents));
  await agent.getByRole("button", { name: "Pedir aprovação" }).click();
  await expect(agent.getByText("aguarda aprovação").last()).toBeVisible({ timeout: 30_000 });

  const approver = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await signIn(approver, "approver-a", password("E2E_APPROVER_A_PASSWORD"));
  await approver.getByRole("link", { name: "Aprovações" }).click();
  await approver.getByRole("button", { name: `Aprovar reembolso de ${amount}` }).click();
  await approver.getByRole("button", { name: `Confirmar aprovação de ${amount}` }).click();
  await expect(approver.getByRole("status")).toContainText("Reembolso aprovado");

  await expect(async () => {
    await agent.reload();
    await expect(agent.getByText("Reembolso simulado registrado")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
});

test("narrow screen keeps the console usable", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await signIn(page, "agent-a", password("E2E_AGENT_A_PASSWORD"));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoViolations(page);
});
