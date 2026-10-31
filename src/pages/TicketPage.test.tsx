import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TicketPage } from "./TicketPage";
import { AGENT_TICKET, axeViolations, fakeApi, json, type Handler } from "../test/helpers";

const route = (task: unknown): Handler => (request) => {
  const path = new URL(request.url).pathname;
  if (path.endsWith("/v1/tasks") && request.method === "POST") return json({ id: "task-1", status: "queued", attempts: 0 }, 202);
  if (path.includes("/v1/tasks/")) return json(task);
  if (path.endsWith("/refund-approvals")) return json({ id: "a-1", state: "pending", action: "issue_refund" }, 202);
  if (path.endsWith("/feedback")) return json({ id: "f-1", status: "recorded" }, 201);
  return json(AGENT_TICKET);
};

describe("TicketPage", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("runs triage as a task with an idempotency key and shows citations", async () => {
    const task = {
      id: "task-1", status: "succeeded", attempts: 1,
      result: { response: "Sua fatura foi explicada.", citations: [{ document_id: "d1", title: "Política", text: "Trecho" }] },
    };
    const { api, requests } = fakeApi(route(task));
    const { container } = render(<TicketPage api={api} id="t-1" canAct />);
    await userEvent.click(await screen.findByRole("button", { name: "Analisar ticket" }));
    await screen.findByText("Sua fatura foi explicada.");
    expect(screen.getByText("Política")).toBeTruthy();
    const post = requests.find((request) => request.url.endsWith("/v1/tasks"));
    expect(post?.headers.get("Idempotency-Key")).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("explains that a proposed refund waits for an approver", async () => {
    const { api } = fakeApi(route({ id: "task-1", status: "needs_approval", attempts: 1, result: { response: "Proposto", approval_state: "pending" } }));
    render(<TicketPage api={api} id="t-1" canAct />);
    await userEvent.click(await screen.findByRole("button", { name: "Analisar ticket" }));
    expect(await screen.findByText(/depois que um aprovador decidir/)).toBeTruthy();
  });

  it("restores the task of this session after a reload", async () => {
    window.sessionStorage.setItem("triage-task:t-1", "task-1");
    const { api } = fakeApi(route({ id: "task-1", status: "succeeded", attempts: 1, result: { response: "Restaurado" } }));
    render(<TicketPage api={api} id="t-1" canAct />);
    expect(await screen.findByText("Restaurado")).toBeTruthy();
  });

  it("reuses the idempotency key when a refund request failed", async () => {
    let attempts = 0;
    const base = route({});
    const { api, requests } = fakeApi((request) => {
      if (request.url.endsWith("/refund-approvals") && ++attempts === 1) return json({ detail: "falha" }, 503);
      return base(request);
    });
    render(<TicketPage api={api} id="t-1" canAct />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Valor em centavos/), "2500");
    await user.click(screen.getByRole("button", { name: "Pedir aprovação" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Pedir aprovação" }));
    await screen.findByText(/Solicitação enviada/);
    const keys = requests.filter((request) => request.url.endsWith("/refund-approvals")).map((request) => request.headers.get("Idempotency-Key"));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("follows the durable task of a manual refund", async () => {
    const base = route({ id: "task-9", status: "needs_approval", attempts: 0, result: null });
    const { api, requests } = fakeApi((request) =>
      request.url.endsWith("/refund-approvals")
        ? json({ id: "a-1", state: "pending", action: "issue_refund", task_id: "task-9" }, 202)
        : base(request));
    render(<TicketPage api={api} id="t-1" canAct />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Valor em centavos/), "1200");
    await user.click(screen.getByRole("button", { name: "Pedir aprovação" }));
    expect(await screen.findByText(/depois que um aprovador decidir/)).toBeTruthy();
    expect(requests.some((request) => request.url.endsWith("/v1/tasks/task-9"))).toBe(true);
    expect(window.sessionStorage.getItem("triage-task:t-1")).toBe("task-9");
  });

  it("states a rejected refund", async () => {
    window.sessionStorage.setItem("triage-task:t-1", "task-1");
    const { api } = fakeApi(route({ id: "task-1", status: "succeeded", attempts: 1, result: { approval_state: "rejected" } }));
    render(<TicketPage api={api} id="t-1" canAct />);
    expect(await screen.findByText(/rejeitado pelo aprovador/)).toBeTruthy();
  });

  it("does not offer agent actions to an approver", async () => {
    const { api } = fakeApi(route({}));
    render(<TicketPage api={api} id="t-1" canAct={false} />);
    await screen.findByText("Explique a cobrança.");
    expect(screen.queryByRole("button", { name: "Analisar ticket" })).toBeNull();
    expect(screen.queryByText("Solicitar reembolso")).toBeNull();
  });

  it("states that a foreign ticket was not found", async () => {
    const { api } = fakeApi(() => json({ detail: "ticket not found" }, 404));
    render(<TicketPage api={api} id="other" canAct />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("ticket not found"));
  });
});
