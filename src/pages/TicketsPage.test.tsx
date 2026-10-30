import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TicketsPage } from "./TicketsPage";
import { AGENT_TICKET, axeViolations, fakeApi, json } from "../test/helpers";

describe("TicketsPage", () => {
  it("lists tickets with the bearer token and no accessibility violations", async () => {
    const { api, requests } = fakeApi(() => json([AGENT_TICKET]));
    const { container } = render(<TicketsPage api={api} canWrite />);
    expect(await screen.findByRole("link", { name: "Dúvida na fatura" })).toHaveProperty("hash", "#/tickets/t-1");
    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer test-token");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("creates a ticket through the contract and reloads", async () => {
    let created = false;
    const { api, requests } = fakeApi((request) => {
      if (request.method === "POST") {
        created = true;
        return json(AGENT_TICKET, 201);
      }
      return json(created ? [AGENT_TICKET] : []);
    });
    render(<TicketsPage api={api} canWrite />);
    await screen.findByText("Nenhum ticket neste tenant ainda.");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Cliente"), "customer-a");
    await user.type(screen.getByLabelText("Assunto"), "Dúvida na fatura");
    await user.type(screen.getByLabelText("Descrição"), "Explique");
    await user.click(screen.getByRole("button", { name: "Criar ticket" }));
    await screen.findByRole("link", { name: "Dúvida na fatura" });
    const post = requests.find((request) => request.method === "POST");
    expect(await post?.json()).toEqual({ customer_id: "customer-a", subject: "Dúvida na fatura", body: "Explique" });
  });

  it("hides the form from a role that cannot write", async () => {
    const { api } = fakeApi(() => json([]));
    render(<TicketsPage api={api} canWrite={false} />);
    await screen.findByText("Nenhum ticket neste tenant ainda.");
    expect(screen.queryByRole("button", { name: "Criar ticket" })).toBeNull();
  });

  it("shows the server failure instead of an empty list", async () => {
    const { api } = fakeApi(() => json({ detail: "ticket:read scope required" }, 403));
    render(<TicketsPage api={api} canWrite={false} />);
    expect((await screen.findByRole("alert")).textContent).toContain("ticket:read scope required");
  });

  it("reports an expired session", async () => {
    let expired = false;
    const { api } = fakeApi(() => json({ detail: "invalid token" }, 401), () => { expired = true; });
    render(<TicketsPage api={api} canWrite={false} />);
    await screen.findByRole("alert");
    expect(expired).toBe(true);
  });
});
