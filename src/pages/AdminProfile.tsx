/**
 * /admin/profile — edit the signed-in admin's display name and avatar.
 *
 * The login email is intentionally read-only here. Email-change flows
 * via OTP/magic link were removed because the auth provider's secure
 * email-change behavior didn't reliably persist the new address in our
 * setup, which created a confusing UX. Admins who need a different
 * login email should be re-invited under the new address.
 *
 * ### auth.users vs public.profiles
 *
 *   - `auth.users` is Supabase-managed. It holds the email, password
 *     hash, OAuth identities, and the canonical `id` (UUID).
 *   - `public.profiles` is OUR table. It holds display_name, avatar_url,
 *     and any other app-specific user data, joined to auth via `user_id`.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User as UserIcon } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

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
      </div>
    </div>
  );
};

export default AdminProfile;
