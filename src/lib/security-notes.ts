/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  SECURITY NOTES — read this before touching auth or storage policies.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * This file is intentionally code-free. It exists as the canonical place for a
 * junior developer to understand the *non-obvious* security decisions baked
 * into this project. The actual policies live in:
 *
 *   • supabase/migrations/*    → row-level security (RLS) on tables and
 *                                storage.objects
 *   • Supabase Auth dashboard  → password rules, signup gating
 *
 * If you change one of those, please update this file too.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 1. Storage buckets — why we DON'T allow public listing
 * ──────────────────────────────────────────────────────────────────────────
 *
 * The two image buckets — `editor-images` and `row-overlays` — are marked
 * `public = true`, which sounds dangerous but isn't. In Supabase storage,
 * "public bucket" only means individual file URLs work without auth (the CDN
 * route `/storage/v1/object/public/<bucket>/<path>` skips RLS).
 *
 * The thing we explicitly LOCK DOWN is the `.list()` operation on
 * `storage.objects`, which goes through RLS. Why?
 *
 *   ▸ Preventing unauthorised enumeration of assets.
 *     If anonymous users could call `supabase.storage.from('editor-images').list()`
 *     they could discover:
 *       - File-naming conventions (e.g. timestamps that leak business cadence)
 *       - Old/orphaned uploads we forgot to delete
 *       - Files an admin uploaded by mistake before realising they were sensitive
 *       - The total volume of media (a competitive-intel signal)
 *
 *   ▸ The website itself never needs `.list()`. It only ever renders an
 *     <img src="<known URL>"> tag, which uses the public CDN route. So
 *     locking down listing has zero impact on visitors.
 *
 *   ▸ Admins still need listing for the Media Gallery, so the SELECT policy
 *     on `storage.objects` requires `is_admin(auth.uid())`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 2. Auth — Leaked Password Protection (HIBP)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Enabled via `supabase--configure_auth({ password_hibp_enabled: true })`.
 *
 *   ▸ Protecting users from credential-stuffing attacks.
 *     When a user signs up or changes their password, Supabase checks the
 *     password against the Have I Been Pwned database (k-anonymous: only the
 *     first 5 chars of the SHA-1 hash leave the server). If it appears in a
 *     known breach, the password is rejected.
 *
 *   ▸ This is purely additive — it does NOT replace minimum-length rules.
 *
 *   ▸ It matters even though `disable_signup = true` because admin password
 *     resets and any future role-based signups will benefit.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 3. Public signups
 * ──────────────────────────────────────────────────────────────────────────
 *
 * `disable_signup = true`. The site is single-tenant; only pre-provisioned
 * admin accounts exist. New admins must be created manually by inserting a
 * row into `public.admin_users` after creating the user in the auth dashboard.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 4. RLS on every table
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Every table in the `public` schema has RLS enabled. The pattern is:
 *
 *   • Public-readable content (published blog posts, published cms_pages,
 *     site_content) → SELECT is open to `anon`.
 *   • Anything admin-managed → wrapped in `is_admin(auth.uid())`, a
 *     SECURITY DEFINER function so RLS never recurses on `admin_users`.
 *   • Service-role-only (email queue, suppression list) → restricted to
 *     `auth.role() = 'service_role'`, which is what edge functions use.
 *
 * If you add a new table, copy this pattern. Never store roles on a profile
 * row — always use the dedicated `admin_users` table.
 */

export {};
