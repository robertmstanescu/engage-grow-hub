/**
 * /admin/profile — edit the signed-in admin's name, avatar, and email.
 *
 * Email change uses Supabase's `updateUser({ email })` which sends a
 * confirmation link to BOTH the old and new addresses. The change only
 * takes effect after both confirmations. This is intentional — it
 * prevents an attacker who briefly hijacks a session from silently
 * locking the real owner out by changing the email.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile, type Profile } from "@/services/profiles";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Skeleton } from "@/components/ui/skeleton";
import ImagePickerField from "@/features/admin/ImagePickerField";

const AdminProfile = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

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

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === email) {
      toast.error("Enter a new email address");
      return;
    }
    await runDbAction({
      action: () => supabase.auth.updateUser({ email: newEmail }),
      setLoading: setSavingEmail,
      successMessage: "Confirmation links sent to both your old and new email. Click both to complete the change.",
      errorMessage: "Could not change email",
    });
    setNewEmail("");
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
          <p className="font-body text-[11px]" style={{ color: "hsl(260 20% 40%)" }}>
            For your security, both your old and new email will receive a confirmation link.
            Both must be confirmed before the change takes effect.
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
            onClick={handleChangeEmail}
            isLoading={savingEmail}
            loadingLabel="Sending…"
            className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}
          >
            Request email change
          </SpinnerButton>
        </section>
      </div>
    </div>
  );
};

export default AdminProfile;
