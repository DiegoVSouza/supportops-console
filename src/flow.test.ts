import { describe, expect, it } from "vitest";
import { STAGES, demoCustomer, usedProjects, viewRun, type RunView } from "./flow";

const base: RunView = { ticketCreated: true, taskAccepted: true, status: "queued", error: null, result: null };
const state = (run: RunView, id: string) => viewRun(run).find((v) => v.stage.id === id)!;

describe("the path of a ticket", () => {
  it("names the earlier project of each stage", () => {
    expect(STAGES.map((s) => s.project)).toEqual(["P06", "P05", "P04", "P02", "P01", "P05", "P05", "P03"]);
  });

  it("waits in the queue before the worker takes the task", () => {
    expect(state(base, "queue").state).toBe("active");
    expect(state(base, "guard").state).toBe("idle");
  });

  it("reads each finished stage from the result, nothing else", () => {
    const run: RunView = { ...base, status: "succeeded", result: {
      response: "ok", citations: [{}, {}], llm_steps: [{}, {}, {}], trace_id: "abcdef0123456789abcdef0123456789",
      customer: { customer_id: "customer-a", tier: "standard" }, invoice: { status: "paid" },
    } };
    expect(state(run, "triage").note).toBe("3 chamadas ao modelo · 2 fontes citadas");
    expect(state(run, "tools").note).toBe("Cliente customer-a encontrado · fatura paid.");
    expect(state(run, "trace").note).toBe("trace abcdef012345…");
    expect(state(run, "approval").state).toBe("skipped");
    expect(usedProjects(viewRun(run))).toEqual(["P06 Console", "P05 Platform", "P04 Async", "P02 Toolkit", "P01 Agents", "P03 Observability"]);
  });

  it("says so when the CRM does not know the customer", () => {
    const run: RunView = { ...base, status: "succeeded", result: { customer: { customer_id: "maria", tier: "unknown", found: false } } };
    expect(state(run, "tools").note).toContain("não está no CRM da demo");
  });

  it("stops at the guard when the text is blocked", () => {
    const run: RunView = { ...base, status: "succeeded", result: { blocked: true, response: "Request blocked by safety policy.", citations: [] } };
    expect(state(run, "guard").state).toBe("failed");
    expect(state(run, "triage").state).toBe("skipped");
    expect(state(run, "trace").state).toBe("skipped");
  });

  it("shows an approval that waits for a second person", () => {
    const run: RunView = { ...base, status: "needs_approval", result: { approval_state: "pending", citations: [] } };
    expect(state(run, "approval")).toMatchObject({ state: "active", note: "Aguardando uma segunda pessoa decidir." });
  });

  it("does not guess where a failed run stopped", () => {
    const run: RunView = { ...base, status: "failed", error: "authorization_failure" };
    expect(state(run, "triage").state).toBe("unknown");
    expect(state(run, "queue").state).toBe("done");
  });

  it("uses the one customer the demo CRM has for the tenant", () => {
    expect(demoCustomer("tenant-b")).toBe("customer-b");
    expect(demoCustomer("")).toBe("customer-a");
  });
});
