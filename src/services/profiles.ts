/**
 * Profiles service — read/write the public.profiles table.
 *
 * ════════════════════════════════════════════════════════════════════
 * JUNIOR-DEV LESSON: auth.users vs public.profiles
 * ════════════════════════════════════════════════════════════════════
 *
 * Supabase's `auth.users` table holds AUTH-CRITICAL data: email,
 * password hash, OAuth identities, last-sign-in timestamp. It lives
 * in the `auth` schema and is OFF-LIMITS from client code — you can't
 * SELECT it, you can't UPDATE it directly. Supabase locks it down to
 * prevent privilege-escalation bugs.
 *
 * For everything else (display name, avatar, bio, preferences) we
 * create a `public.profiles` table linked by `user_id`. Why a
 * separate table?
 *
 *   1) **Permissions**: We control RLS on `public.profiles`. We can
 *      let users read their own profile, let admins read everyone's,
 *      and never expose password hashes or session tokens.
 *
 *   2) **Schema freedom**: Supabase upgrades `auth.users` over time;
 *      adding our own columns there would risk conflicts.
 *
 *   3) **Joins are easy**: `select profiles!inner(...)` works just
 *      like a foreign-key relationship.
 *
 * The link is automatic: a database trigger (`handle_new_user`) fires
 * on every `auth.users` INSERT and creates a matching profile row.
 * Users never have to manually create their profile.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch the currently logged-in user's profile (or null if not logged in). */
export const getMyProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
};

/** Update the current user's display name + avatar. */
export const updateMyProfile = async (patch: { display_name?: string; avatar_url?: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  // Upsert so first-time admins (whose trigger somehow missed them) still work.
  return supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
};
