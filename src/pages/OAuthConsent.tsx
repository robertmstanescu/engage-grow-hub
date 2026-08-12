/**
 * OAuth consent screen — routed at /.lovable/oauth/consent
 *
 * Supabase Auth (the OAuth 2.1 authorization server) redirects users here so
 * they can approve or deny an MCP client (ChatGPT, Claude, Lovable, …) that
 * wants to act as them against this app's MCP server.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/admin?next=${encodeURIComponent(next)}`;
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: decisionError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "this app";

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 space-y-5"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
      >
        {error ? (
          <>
            <h1 className="font-display text-xl font-black" style={{ color: "hsl(var(--secondary))" }}>
              Authorization failed
            </h1>
            <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {error}
            </p>
          </>
        ) : !details ? (
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Loading…
          </p>
        ) : (
          <>
            <h1 className="font-display text-xl font-black" style={{ color: "hsl(var(--secondary))" }}>
              Connect {clientName}
            </h1>
            <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {clientName} is asking to use this site's agent tools as you. It will be able to read and
              edit the content your account can access.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3 rounded-full disabled:opacity-50"
                style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3 rounded-full border disabled:opacity-50"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              >
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
