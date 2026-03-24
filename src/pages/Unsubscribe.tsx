import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Unsubscribe = () => {
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("done");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="max-w-md text-center space-y-6">
        <h1 className="font-display text-2xl font-black" style={{ color: "hsl(var(--secondary))" }}>
          {status === "done" ? "You're unsubscribed" :
           status === "already" ? "Already unsubscribed" :
           status === "invalid" ? "Invalid link" :
           status === "error" ? "Something went wrong" :
           "Unsubscribe"}
        </h1>
        {status === "valid" && (
          <>
            <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Click below to unsubscribe from all marketing emails.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={processing}
              className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-8 py-3.5 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {processing ? "Processing…" : "Confirm Unsubscribe"}
            </button>
          </>
        )}
        {status === "done" && (
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            You won't receive any more marketing emails from us.
          </p>
        )}
        {status === "already" && (
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            You've already been unsubscribed from our emails.
          </p>
        )}
        {status === "loading" && (
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Verifying…</p>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
