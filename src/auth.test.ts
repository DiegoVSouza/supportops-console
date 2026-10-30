import type { User } from "oidc-client-ts";
import { describe, expect, it } from "vitest";
import { isCallback, sessionFrom } from "./auth";

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("auth", () => {
  it("reads display claims from the access token", () => {
    const access_token = `h.${encode({ preferred_username: "agent-a", tenant_id: "tenant-a", roles: ["agent"] })}.s`;
    const session = sessionFrom({ access_token, profile: {} } as unknown as User);
    expect(session).toEqual({ token: access_token, username: "agent-a", tenant: "tenant-a", roles: ["agent"] });
  });

  it("recognizes only a real redirect callback", () => {
    expect(isCallback("?code=1&state=2")).toBe(true);
    expect(isCallback("?error=access_denied&state=2")).toBe(true);
    expect(isCallback("?code=1")).toBe(false);
    expect(isCallback("")).toBe(false);
  });
});
