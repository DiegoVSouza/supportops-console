import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForIdentityServer } from "./App";

describe("waitForIdentityServer", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps trying until the identity server answers", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError("refused"))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const result = waitForIdentityServer("https://idp.test/realms/x");
    await vi.advanceTimersByTimeAsync(7000);
    await expect(result).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://idp.test/realms/x/.well-known/openid-configuration");
  });

  it("gives up instead of waiting forever", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("refused")));
    const result = waitForIdentityServer("https://idp.test/realms/x");
    await vi.advanceTimersByTimeAsync(250_000);
    await expect(result).resolves.toBe(false);
  });
});
