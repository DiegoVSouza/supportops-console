// Captures the main screens for visual review. Run through scripts/e2e.py is not needed:
// node e2e/screens.mjs <output-dir>, with E2E_AGENT_A_PASSWORD set.
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "test-results";
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1000, height: 760 } });
const page = await context.newPage();
await page.goto("http://localhost:48080/");
await page.getByRole("button", { name: "Entrar" }).waitFor();
await page.screenshot({ path: `${out}/signin.png` });
await page.getByRole("button", { name: "Entrar" }).click();
await page.locator("#username").fill("agent-a");
await page.locator("#password").fill(process.env.E2E_AGENT_A_PASSWORD);
await page.locator("#kc-login").click();
await page.getByRole("heading", { level: 1, name: "Tickets" }).waitFor();
await page.getByRole("article").first().waitFor();
await page.screenshot({ path: `${out}/tickets.png`, fullPage: false });
await page.getByRole("article").first().getByRole("link").click();
await page.getByRole("heading", { name: "Análise" }).waitFor();
await page.screenshot({ path: `${out}/ticket.png`, fullPage: true });
await browser.close();
