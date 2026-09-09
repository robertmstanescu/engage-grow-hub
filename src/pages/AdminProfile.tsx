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
import { ArrowLeft, Linkedin, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile, type Profile } from "@/services/profiles";
import { fetchSection, publishSection } from "@/services/siteContent";
import type { AuthorProfile } from "@/features/site/authorProfile";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Skeleton } from "@/components/ui/skeleton";
import ImagePickerField from "@/features/admin/ImagePickerField";
import useNoIndex from "@/hooks/useNoIndex";

const AdminProfile = () => {
  useNoIndex();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  /* Public author details. These are not private profile data: they
     show under every blog post, so they live in site_content
     ("author_profile"), which the public site can read. `profiles` is
     readable by signed-in users only, so the name and photo have to be
     kept here too rather than read from Identity at render time. */
  const [authorName, setAuthorName] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState("");
  const [authorPhotoAlt, setAuthorPhotoAlt] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [savingAuthor, setSavingAuthor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin"); return; }
      const [p, author] = await Promise.all([getMyProfile(), fetchSection<AuthorProfile>("author_profile")]);
      if (cancelled) return;
      const saved = author.data?.content || {};
      setProfile(p);
      setEmail(user.email || "");
      setDisplayName(p?.display_name || "");
      setAvatarUrl(p?.avatar_url || "");
      /* Nothing saved yet: start from Identity, so the first visit here
         after the upgrade already shows the right author. */
      setAuthorName(saved.name || p?.display_name || "");
      setAuthorPhoto(saved.photo || p?.avatar_url || "");
      setAuthorPhotoAlt(saved.photo_alt || "");
      setLinkedinUrl(saved.linkedin || "");
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

  const handleSaveAuthor = async () => {
    const next: AuthorProfile = {
      name: authorName.trim(),
      photo: authorPhoto.trim(),
      photo_alt: authorPhotoAlt.trim(),
      linkedin: linkedinUrl.trim(),
    };
    await runDbAction({
      action: () => publishSection("author_profile", next),
      setLoading: setSavingAuthor,
      successMessage: "Author details saved",
    });
  };

  if (loading || adminLoading) {
    return (
      <div className="admin-light min-h-screen p-8" style={{ backgroundColor: "hsl(var(--background))" }}>
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
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Access denied.</p>
      </div>
    );
  }

  const initials = (displayName || email).slice(0, 2).toUpperCase();

  return (
    <div className="admin-light min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="max-w-xl mx-auto p-8 space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 font-body text-xs hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
          <ArrowLeft size={13} /> Back to dashboard
        </Link>

        <div>
          <h1 className="font-display text-2xl font-black" style={{ color: "hsl(var(--foreground))" }}>My Profile</h1>
          <p className="font-body text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Role: <strong>Admin</strong> · {email}
          </p>
        </div>

        {/* Avatar + Name */}
        <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="font-display text-xs uppercase tracking-wider font-bold" style={{ color: "hsl(var(--foreground))" }}>Identity</h2>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" style={{ borderColor: "hsl(var(--border))" }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-lg font-bold" style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}>
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
            <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
              <UserIcon size={10} className="inline mr-1" /> Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
            />
          </div>

          <SpinnerButton
            onClick={handleSaveProfile}
            isLoading={savingProfile}
            loadingLabel="Saving…"
            className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
          >
            Save profile
          </SpinnerButton>
        </section>

        {/* Public author details */}
        <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <div>
            <h2 className="font-display text-xs uppercase tracking-wider font-bold" style={{ color: "hsl(var(--foreground))" }}>Author details</h2>
            <p className="font-body text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              The block under every blog post: your name, your photo and your links. Set once here — posts do not ask for it. Use your own LinkedIn page; the company page in Settings stays on the site&rsquo;s social links.
            </p>
          </div>

          <div>
            <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
              <UserIcon size={10} className="inline mr-1" /> Name under the article
            </label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Who readers see as the author"
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
            />
          </div>

          <ImagePickerField
            label="Photo under the article"
            value={authorPhoto}
            onChange={setAuthorPhoto}
            altValue={authorPhotoAlt}
            onAltChange={setAuthorPhotoAlt}
          />

          <div>
            <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
              <Linkedin size={10} className="inline mr-1" /> Your LinkedIn page
            </label>
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-name/"
              inputMode="url"
              spellCheck={false}
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
            />
            <p className="font-body text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Leave it empty to fall back to the company page.
            </p>
          </div>

          <SpinnerButton
            onClick={handleSaveAuthor}
            isLoading={savingAuthor}
            loadingLabel="Saving…"
            className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
          >
            Save author details
          </SpinnerButton>
        </section>
      </div>
    </div>
  );
};

export default AdminProfile;
