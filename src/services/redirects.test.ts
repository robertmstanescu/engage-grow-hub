import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: client.rpc, from: client.from },
}));

import { lookupRedirect } from "./redirects";

describe("public redirect access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.rpc.mockReturnValue({ maybeSingle: client.maybeSingle });
  });

  it("resolves only the requested path without reading the admin table", async () => {
    client.maybeSingle.mockResolvedValue({
      data: { to_path: "/services", status_code: 301 },
      error: null,
    });

    const result = await lookupRedirect("/old-services/?source=test#intro");

    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("lookup_public_redirect", {
      _from_path: "/old-services",
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(result.data).toEqual({ to_path: "/services", status_code: 301 });
  });

  it("does not fall back to reading all records for an unknown path", async () => {
    client.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await lookupRedirect("/missing-page");

    expect(result.data).toBeNull();
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("lookup_public_redirect", {
      _from_path: "/missing-page",
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("does not bypass restrictions when the lookup fails", async () => {
    const error = { message: "Lookup unavailable" };
    client.maybeSingle.mockResolvedValue({ data: null, error });

    const result = await lookupRedirect("/old-page");

    expect(result.error).toBe(error);
    expect(client.from).not.toHaveBeenCalled();
  });
});