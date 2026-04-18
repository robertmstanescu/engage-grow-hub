/**
 * /admin/profile — edit the signed-in admin's name, avatar, and email.
 *
 * ## Code-Verified Email Change (OTP flow)
 *
 * We use Supabase's built-in 8-character OTP for email change instead of
 * relying on the user clicking a magic link in their inbox.
 *
 * ### Why OTP > magic link for sensitive changes
 *
 *   1. **No redirect loops.** Magic links bounce through the Supabase
 *      Auth domain → your site → back to a session — if any redirect URL
 *      is misconfigured, the link silently fails. OTP just verifies in-app.
 *   2. **Resilient to email rendering.** Some clients rewrite or break
 *      long links (Outlook safe-links, corporate proxies). An 8-character
 *      code is plain text and impossible to mangle.
 *   3. **Tighter audit trail.** The user PROVES possession of the inbox
 *      by typing the code into THIS session — no risk that an old link
 *      sitting in a forwarded email chain triggers the change later.
 *   4. **Clearer UX for misspellings.** If you typo the new address, no
 *      code arrives — you find out in seconds, not after refreshing your
 *      inbox. With links, a typo can lock you out silently.
 *
 * ### Supabase mechanics
 *
 *   - `auth.updateUser({ email: newEmail })` triggers Supabase to email
 *     an 8-character token to BOTH the old and new addresses (Secure Email
 *     Change is on by default).
 *   - The user enters either code into our OTP input.
 *   - We call `auth.verifyOtp({ email: newEmail, token, type: "email_change" })`
 *     which finalizes the change and refreshes the session.
 *
 * ### auth.users vs public.profiles
 *
 *   - `auth.users` is Supabase-managed. It holds the email, password
 *     hash, OAuth identities, and the canonical `id` (UUID).
 *   - `public.profiles` is OUR table. It holds display_name, avatar_url,
 *     and any other app-specific user data, joined to auth via `user_id`.
 *   - When email changes in `auth.users`, our `profiles` row stays
 *     untouched — the link is the user_id, not the email.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, User as UserIcon, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile, type Profile } from "@/services/profiles";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import ImagePickerField from "@/features/admin/ImagePickerField";

const AdminProfile = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin"); return; }
      const p = await getMyProfile();
      if (cancelled) return;
      setProfile(p);
      setEmail(user.email || "");
      setDisplayName(p?.display_name || "");
      setAvatarUrl(p?.avatar_url || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSaveProfile = async () => {
    await runDbAction({
      action: () => updateMyProfile({ display_name: displayName, avatar_url: avatarUrl }),
      setLoading: setSavingProfile,
      successMessage: "Profile updated",
    });
  };

  /**
   * Step 1 — request the verification code.
   * Supabase emails an 8-character OTP to BOTH the old and the new address.
   */
  const handleRequestCode = async () => {
    if (!newEmail || newEmail === email) {
      toast.error("Enter a new email address");
      return;
    }
    setRequestingCode(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setRequestingCode(false);
    if (error) {
      toast.error(error.message || "Could not send verification code");
      return;
    }
    setPendingEmail(newEmail);
    setOtpSent(true);
    toast.success("Verification code sent", {
      description: `Check ${email} and ${newEmail} — enter either 8-character code below.`,
    });
  };

  /**
   * Step 2 — verify the code and finalize the change.
   * On success, Supabase refreshes the session with the new email.
   */
  const handleVerifyCode = async () => {
    if (otp.length !== 8) {
      toast.error("Enter the 8-character code");
      return;
    }
    setVerifyingCode(true);
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otp,
      type: "email_change",
    });
    setVerifyingCode(false);
    if (error) {
      toast.error(error.message || "Invalid or expired code");
      return;
    }
    toast.success("Email successfully updated", {
      description: `Your admin account now uses ${pendingEmail}.`,
    });
    setEmail(pendingEmail);
    setNewEmail("");
    setPendingEmail("");
    setOtp("");
    setOtpSent(false);
  };

  const handleCancelChange = () => {
    setOtpSent(false);
    setOtp("");
    setPendingEmail("");
  };

  if (loading || adminLoading) {
    return (
      <div className="admin-light min-h-screen p-8" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <p className="font-body text-sm" style={{ color: "hsl(260 20% 40%)" }}>Access denied.</p>
      </div>
    );
  }

  const initials = (displayName || email).slice(0, 2).toUpperCase();

  return (
    <div className="admin-light min-h-screen" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
      <div className="max-w-xl mx-auto p-8 space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 font-body text-xs hover:opacity-70" style={{ color: "hsl(260 20% 40%)" }}>
          <ArrowLeft size={13} /> Back to dashboard
        </Link>

        <div>
          <h1 className="font-display text-2xl font-black" style={{ color: "hsl(260 30% 20%)" }}>My Profile</h1>
          <p className="font-body text-xs mt-1" style={{ color: "hsl(260 20% 40%)" }}>
            Role: <strong>Admin</strong> · {email}
          </p>
        </div>

        {/* Avatar + Name */}
        <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "white", borderColor: "hsl(260 15% 88%)" }}>
          <h2 className="font-display text-xs uppercase tracking-wider font-bold" style={{ color: "hsl(260 30% 20%)" }}>Identity</h2>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" style={{ borderColor: "hsl(260 15% 88%)" }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-lg font-bold" style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}>
                {initials}
              </div>
            )}
            <div className="flex-1">
              <ImagePickerField
                label="Avatar URL"
                value={avatarUrl}
                onChange={setAvatarUrl}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(260 20% 40%)" }}>
              <UserIcon size={10} className="inline mr-1" /> Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(260 15% 88%)", backgroundColor: "white", color: "hsl(260 30% 20%)" }}
            />
          </div>

          <SpinnerButton
            onClick={handleSaveProfile}
            isLoading={savingProfile}
            loadingLabel="Saving…"
            className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}
          >
            Save profile
          </SpinnerButton>
        </section>

        {/* Email change */}
        <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "white", borderColor: "hsl(260 15% 88%)" }}>
          <h2 className="font-display text-xs uppercase tracking-wider font-bold" style={{ color: "hsl(260 30% 20%)" }}>
            <Mail size={11} className="inline mr-1" /> Change Email
          </h2>
          <p className="font-body text-xs" style={{ color: "hsl(260 20% 40%)" }}>
            Current: <strong>{email}</strong>
          </p>

          {!otpSent ? (
            <>
              <p className="font-body text-[11px]" style={{ color: "hsl(260 20% 40%)" }}>
                We'll send an 8-character verification code to your current email.
                Enter the code here to confirm the change instantly — no link clicking required.
              </p>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="w-full px-3 py-2 rounded-lg font-body text-sm border"
                style={{ borderColor: "hsl(260 15% 88%)", backgroundColor: "white", color: "hsl(260 30% 20%)" }}
              />
              <SpinnerButton
                onClick={handleRequestCode}
                isLoading={requestingCode}
                loadingLabel="Sending code…"
                className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
                style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}
              >
                Send verification code
              </SpinnerButton>
            </>
          ) : (
            <>
              <div className="rounded-lg p-3" style={{ backgroundColor: "hsl(260 30% 96%)", border: "1px solid hsl(260 15% 88%)" }}>
                <p className="font-body text-[11px]" style={{ color: "hsl(260 30% 20%)" }}>
                  <KeyRound size={11} className="inline mr-1" />
                  Enter the 8-character code sent to <strong>{email}</strong>
                  {" "}and <strong>{pendingEmail}</strong>.
                </p>
              </div>

              <div className="flex justify-center py-2">
                <InputOTP maxLength={8} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex gap-2">
                <SpinnerButton
                  onClick={handleVerifyCode}
                  isLoading={verifyingCode}
                  loadingLabel="Verifying…"
                  disabled={otp.length !== 8}
                  className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
                  style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}
                >
                  Verify & update email
                </SpinnerButton>
                <button
                  type="button"
                  onClick={handleCancelChange}
                  className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-70 transition-opacity border"
                  style={{ borderColor: "hsl(260 15% 88%)", color: "hsl(260 20% 40%)" }}
                >
                  Cancel
                </button>
              </div>

              <button
                type="button"
                onClick={handleRequestCode}
                disabled={requestingCode}
                className="font-body text-[10px] underline hover:opacity-70 transition-opacity"
                style={{ color: "hsl(260 20% 40%)" }}
              >
                Didn't get a code? Resend
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminProfile;
