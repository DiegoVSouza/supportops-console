import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DemoRunner } from "./DemoRunner";
import { AGENT_TICKET, axeViolations, fakeApi, json } from "../test/helpers";

describe("DemoRunner", () => {
  it("one click creates the ticket, starts the analysis and draws the path with the projects", async () => {
    const { api, requests } = fakeApi((request) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/v1/tickets")) return json(AGENT_TICKET, 201);
      if (pathname.endsWith("/v1/tasks")) return json({ id: "task-1", status: "queued" }, 202);
      return json({ id: "task-1", status: "succeeded", result: {
        response: "Use o link de redefinição.", citations: [{ title: "Senha" }], trace_id: "0123456789abcdef0123456789abcdef",
        customer: { customer_id: "customer-a", tier: "standard" }, invoice: { status: "paid" },
      } });
    });
    const { container } = render(<DemoRunner api={api} tenant="tenant-a" onCreated={async () => undefined} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Não consigo entrar" }));
    expect(await screen.findByText("Use o link de redefinição.")).toBeTruthy();
    const post = requests.find((r) => r.method === "POST" && r.url.endsWith("/v1/tickets"));
    expect(((await post!.json()) as { customer_id: string }).customer_id).toBe("customer-a");
    expect(screen.getByText(/Projetos usados nesta execução: P06 Console, P05 Platform, P04 Async, P02 Toolkit, P01 Agents, P03 Observability/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("offers a retry when the ticket cannot be created", async () => {
    const { api } = fakeApi(() => json({ detail: "ticket:write scope required" }, 403));
    render(<DemoRunner api={api} tenant="tenant-a" onCreated={async () => undefined} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cobrança em duplicidade" }));
    expect((await screen.findByRole("alert")).textContent).toContain("ticket:write scope required");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  });
});
