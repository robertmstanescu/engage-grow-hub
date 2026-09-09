import { describe, expect, it } from "vitest";
import { readServiceAccountKey, searchConsoleUsersUrl } from "../serviceAccountKey";

const good = JSON.stringify({ type: "service_account", project_id: "coffin-search", client_email: "search@coffin-search.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n" });

describe("readServiceAccountKey", () => {
  it("reads the email and project from a real key file", () => {
    expect(readServiceAccountKey(good)).toEqual({ ok: true, email: "search@coffin-search.iam.gserviceaccount.com", project: "coffin-search" });
  });
  it("says nothing for an empty box", () => {
    expect(readServiceAccountKey("   ")).toEqual({ ok: false, reason: "" });
  });
  it("names an OAuth client file", () => {
    const r = readServiceAccountKey(JSON.stringify({ installed: { client_id: "x" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/OAuth client/);
  });
  it("names a bare API key", () => {
    const r = readServiceAccountKey("AIzaSyD-abcdefghijklmnopqrstuvwxyz1234567");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/API key/);
  });
  it("names a pasted private key on its own", () => {
    const r = readServiceAccountKey("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/whole file/);
  });
  it("names a key file without a private key", () => {
    const r = readServiceAccountKey(JSON.stringify({ type: "service_account", client_email: "a@b" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/private_key/);
  });
});

describe("searchConsoleUsersUrl", () => {
  it("points at the users page of the domain property", () => {
    expect(searchConsoleUsersUrl("themagiccoffin.com")).toBe("https://search.google.com/search-console/users?resource_id=sc-domain%3Athemagiccoffin.com");
  });
});
