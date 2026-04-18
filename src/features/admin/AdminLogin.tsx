/**
 * AdminLogin — single-form auth gate to the admin panel.
 *
 * Async UX:
 *   • {@link runDbAction} wraps signInWithPassword so we get a uniform error
 *     toast and the loading flag is reset in `finally` no matter what.
 *   • The submit button is a {@link SpinnerButton} — disabled + spinner while
 *     the request is in flight — so a slow network can never produce two
 *     parallel sign-in attempts.
 *
 * (We intentionally use a generic "Invalid credentials" error rather than the
 * raw Supabase message so we don't leak whether an email exists in the DB.)
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await runDbAction({
      action: () => supabase.auth.signInWithPassword({ email, password }),
      setLoading: setIsAuthenticating,
      // Generic message — never confirm whether an email exists.
      errorMessage: "Invalid credentials",
      // Suppress the success toast — the auth listener will redirect us
      // straight into the dashboard, so a "Signed in!" toast is just noise.
      successMessage: null,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl font-black text-center" style={{ color: "hsl(var(--secondary))" }}>
          Admin Login
        </h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
        />
        <SpinnerButton
          type="submit"
          isLoading={isAuthenticating}
          loadingLabel="Signing in…"
          className="w-full font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3.5 rounded-full hover:opacity-85 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          Sign In
        </SpinnerButton>
      </form>
    </div>
  );
};

export default AdminLogin;
