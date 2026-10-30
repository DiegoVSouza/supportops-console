import axe from "axe-core";
import { createApi } from "../api/client";

export const AGENT_TICKET = {
  id: "t-1", tenant_id: "tenant-a", customer_id: "customer-a", subject: "Dúvida na fatura",
  body: "Explique a cobrança.", status: "open", created_at: "2026-10-30T12:00:00Z",
};

export type Handler = (request: Request) => Response | Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export function fakeApi(handler: Handler, onUnauthorized: () => void = () => undefined) {
  const requests: Request[] = [];
  const fetcher = (async (input: Request) => {
    requests.push(input.clone());
    return handler(input);
  }) as typeof fetch;
  return { api: createApi("http://console.test/api", () => "test-token", onUnauthorized, fetcher), requests };
}

export async function axeViolations(container: Element): Promise<string[]> {
  // jsdom has no layout, so contrast is verified against the real stack in e2e.
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => violation.id);
}
