/** Execute the real edge handlers with isolated network/auth dependencies. */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind } from "typescript";
import { describe, expect, it, vi } from "vitest";

function edgeHarness(name: string, enqueueFails = false) {
  let handler: (req: Request) => Promise<Response> = async () => new Response(null, { status: 500 });
  const logs: unknown[][] = [];
  const gateway = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: {
    content: "ALT: Two colleagues discussing work\nDESCRIPTION: Colleagues in a meeting.",
    tool_calls: [{ function: { arguments: JSON.stringify({ meta_title: "People operations", meta_description: "People support", ai_summary: "People support", tags: [] }) } }],
  } }] }), { status: 200 }));
  const verifiedPayload = { version: "1", run_id: "test-run", data: {
    action_type: "recovery", email: "private-recipient@example.test", url: "https://example.test/reset", token: "private-test-token",
  } };
  const createClient = vi.fn((_url: string, _key: string, options?: { global?: { headers?: { Authorization?: string } } }) => {
    const bearer = options?.global?.headers?.Authorization;
    return {
      auth: { getUser: vi.fn(async () => ({
        data: { user: bearer === "Bearer administrator" ? { id: "administrator" } : bearer === "Bearer member" ? { id: "member" } : null },
        error: bearer === "Bearer invalid" ? { message: "Invalid token" } : null,
      })) },
      from: (table: string) => ({
        select: () => ({ eq: (_column: string, id: string) => ({ maybeSingle: async () => ({
          data: table === "admin_users" && id === "administrator" ? { id: "membership" } : null,
        }) }) }),
        insert: async () => ({ error: null }),
      }),
      rpc: async () => ({ error: enqueueFails ? { message: verifiedPayload.data.email } : null }),
    };
  });
  const cache = new Map<string, Record<string, unknown>>();
  const load = (path: string): Record<string, unknown> => {
    const cached = cache.get(path);
    if (cached) return cached;
    const exports: Record<string, unknown> = {};
    cache.set(path, exports);
    const source = transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
    const require = (id: string): unknown => {
      if (id.startsWith(".")) {
        if (id.includes("email-templates")) return {
          SignupEmail: () => null, InviteEmail: () => null, MagicLinkEmail: () => null,
          RecoveryEmail: () => null, ReauthenticationEmail: () => null,
        };
        return load(resolve(dirname(path), id));
      }
      if (id.includes("supabase-js")) return { createClient };
      if (id.includes("webhooks-js")) return { WebhookError: class extends Error {}, verifyWebhookRequest: async () => ({ payload: verifiedPayload }) };
      if (id.includes("email-js")) return { parseEmailWebhookPayload: () => verifiedPayload };
      if (id.includes("@react-email")) return { renderAsync: async () => "Test email" };
      if (id.startsWith("npm:react")) return { createElement: () => ({}) };
      throw new Error(`Unexpected test dependency: ${id}`);
    };
    runInNewContext(source, {
      exports, require, Response, Request, URL, fetch: gateway,
      Deno: { env: { get: (key: string) => ({ SUPABASE_URL: "https://example.test", SUPABASE_ANON_KEY: "test-public", SUPABASE_SERVICE_ROLE_KEY: "test-service", LOVABLE_API_KEY: "test-ai" })[key] }, serve: (fn: typeof handler) => { handler = fn; } },
      console: { log: (...args: unknown[]) => logs.push(args), error: (...args: unknown[]) => logs.push(args) },
      crypto: { randomUUID: () => "test-message" },
    }, { filename: path });
    return exports;
  };
  load(resolve("supabase/functions", name, "index.ts"));
  return { call: (req: Request) => handler(req), gateway, logs };
}

describe.each(["describe-image", "generate-seo-suggestions"])("administrator-only %s", (name) => {
  it.each([undefined, "invalid", "member"])("rejects %s without consuming credits", async (token) => {
    const edge = edgeHarness(name);
    const response = await edge.call(new Request("https://example.test", {
      method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ title: "People operations", imageUrl: "https://example.test/photo.jpg" }),
    }));
    expect(response.status).toBe(token === "member" ? 403 : 401);
    expect(edge.gateway).not.toHaveBeenCalled();
  });
  it("still serves verified administrators", async () => {
    const edge = edgeHarness(name);
    const response = await edge.call(new Request("https://example.test", {
      method: "POST", headers: { Authorization: "Bearer administrator" },
      body: JSON.stringify({ title: "People operations", imageUrl: "https://example.test/photo.jpg" }),
    }));
    expect(response.status).toBe(200);
    expect(edge.gateway).toHaveBeenCalledTimes(1);
  });
});

describe("authentication email diagnostic privacy", () => {
  it.each([false, true])("omits recipient addresses when enqueue failure is %s", async (fails) => {
    const edge = edgeHarness("auth-email-hook", fails);
    const response = await edge.call(new Request("https://example.test", { method: "POST" }));
    expect(response.status).toBe(fails ? 500 : 200);
    expect(edge.logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(edge.logs)).not.toContain("private-recipient@example.test");
    expect(JSON.stringify(edge.logs)).not.toContain("private-test-token");
  });
});