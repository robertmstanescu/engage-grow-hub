/**
 * AdminLogin — passwordless-first admin auth gate.
 *
 * ════════════════════════════════════════════════════════════════════
 * JUNIOR-DEV LESSON: WHY OAUTH/SSO + MAGIC LINKS REDUCES "ATTACK SURFACE"
 * ════════════════════════════════════════════════════════════════════
 *
 * "Attack surface" = the set of ways an attacker can try to get in.
 *
 * A traditional password login has a HUGE surface:
 *   • Credential stuffing (reusing leaked passwords from other breaches)
 *   • Brute-force / password spraying
 *   • Phishing pages that mimic the login form
 *   • Keyloggers on the user's machine
 *   • Weak passwords the user picked
 *   • Database breaches that leak password hashes
 *
 * With OAuth/SSO (Google, Apple) + Magic Links:
 *   • We never store a password — there's nothing to leak.
 *   • The identity provider (Google/Apple) handles 2FA, device trust,
 *     anomaly detection, and account recovery — at a level no small
 *     project could match in-house.
 *   • Magic links require access to the user's INBOX, which is already
 *     protected by their email provider's MFA.
 *   • Phishing is harder: there's no password field for an attacker
 *     to harvest.
 *
 * We keep the password field as a hidden "break-glass" fallback in
 * case email delivery breaks. It's reachable via the secret toggle
 * below — visible only when you Shift+click the title 5 times.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);

  /**
   * Send a magic link. Supabase emails the user a one-time login URL
   * — clicking it logs them in without ever entering a password.
   */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    await runDbAction({
      action: () => supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      }),
      setLoading: setIsSendingLink,
      successMessage: "Magic link sent — check your email.",
      errorMessage: "Could not send magic link.",
    });
  };

  /** Google / Apple SSO via Lovable Cloud's managed OAuth. */
  const handleSso = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/admin`,
    });
    if (result.error) toast.error("SSO sign-in failed");
  };

  /** Break-glass password sign-in — hidden by default. */
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await runDbAction({
      action: () => supabase.auth.signInWithPassword({ email, password }),
      setLoading: setIsAuthenticating,
      errorMessage: "Invalid credentials",
      successMessage: null,
    });
  };

  // Easter-egg toggle: shift+click the title 5x to reveal password.
  const handleTitleClick = (e: React.MouseEvent) => {
    if (!e.shiftKey) return;
    const next = titleClicks + 1;
    setTitleClicks(next);
    if (next >= 5) {
      setShowPasswordFallback(true);
      toast("Break-glass password sign-in revealed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="w-full max-w-sm space-y-6">
        <h1
          onClick={handleTitleClick}
          className="font-display text-2xl font-black text-center cursor-default select-none"
          style={{ color: "hsl(var(--secondary))" }}
        >
          Admin Sign-In
        </h1>

        {/* SSO buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleSso("google")}
            className="w-full font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3 rounded-full border hover:opacity-85 transition-opacity flex items-center justify-center gap-2"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleSso("apple")}
            className="w-full font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3 rounded-full border hover:opacity-85 transition-opacity flex items-center justify-center gap-2"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
          <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        </div>

        {/* Magic link form */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
          />
          <SpinnerButton
            type="submit"
            isLoading={isSendingLink}
            loadingLabel="Sending…"
            icon={<Mail size={13} />}
            className="w-full font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3.5 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            Send magic link
          </SpinnerButton>
        </form>

        {/*
          Break-glass password fallback. Hidden by default — Shift+click
          the title 5 times to reveal. This is here so a broken email
          provider can never lock the team out completely.
        */}
        {showPasswordFallback && (
          <form onSubmit={handlePassword} className="space-y-3 pt-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="font-body text-[10px] uppercase tracking-wider text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              Break-glass password sign-in
            </p>
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
              className="w-full font-display text-[10px] uppercase tracking-[0.08em] font-bold py-3 rounded-full border hover:opacity-85 transition-opacity"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "transparent" }}
            >
              Sign in with password
            </SpinnerButton>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
