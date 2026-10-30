import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApprovalsPage } from "./ApprovalsPage";
import { axeViolations, fakeApi, json } from "../test/helpers";

const APPROVAL = {
  id: "a-1", ticket_id: "t-1", action: "issue_refund", amount_cents: 2500, state: "pending",
  requested_by: "agent-a", created_at: "2026-10-30T12:00:00Z",
};

describe("ApprovalsPage", () => {
  it("shows amount and requester before any decision", async () => {
    const { api } = fakeApi(() => json([APPROVAL]));
    const { container } = render(<ApprovalsPage api={api} canApprove />);
    const row = (await screen.findByRole("cell", { name: "25,00" })).closest("tr") as HTMLElement;
    expect(within(row).getByText("agent-a")).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("requires a confirmation that names the amount", async () => {
    let open = true;
    const { api, requests } = fakeApi((request) => {
      if (request.method === "POST") {
        open = false;
        return json({ id: "a-1", state: "approved" });
      }
      return json(open ? [APPROVAL] : []);
    });
    render(<ApprovalsPage api={api} canApprove />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Aprovar reembolso de 25,00" }));
    expect(requests.some((request) => request.method === "POST")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação de 25,00" }));
    await screen.findByText("Nenhuma aprovação pendente.");
    expect(screen.getByRole("status").textContent).toContain("Reembolso aprovado");
    expect(await requests.find((request) => request.method === "POST")?.json()).toEqual({ decision: "approved" });
  });

  it("shows why the server refused the decision", async () => {
    const { api } = fakeApi((request) =>
      request.method === "POST" ? json({ detail: "requester cannot approve their own refund" }, 403) : json([APPROVAL]));
    render(<ApprovalsPage api={api} canApprove />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Rejeitar reembolso de 25,00" }));
    await user.click(screen.getByRole("button", { name: "Confirmar rejeição de 25,00" }));
    expect((await screen.findByRole("alert")).textContent).toContain("requester cannot approve");
  });

  it("does not call the API for a role that cannot approve", () => {
    const { api, requests } = fakeApi(() => json([]));
    render(<ApprovalsPage api={api} canApprove={false} />);
    expect(screen.getByRole("alert").textContent).toContain("não permite");
    expect(requests).toHaveLength(0);
  });
});
