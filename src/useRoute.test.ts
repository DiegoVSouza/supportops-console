import { describe, expect, it } from "vitest";
import { parseRoute } from "./useRoute";

describe("parseRoute", () => {
  it("maps hashes to screens and defaults to tickets", () => {
    expect(parseRoute("#/approvals")).toEqual({ name: "approvals" });
    expect(parseRoute("#/tickets/a%2Fb")).toEqual({ name: "ticket", id: "a/b" });
    expect(parseRoute("#/tickets")).toEqual({ name: "tickets" });
    expect(parseRoute("")).toEqual({ name: "tickets" });
  });
});
