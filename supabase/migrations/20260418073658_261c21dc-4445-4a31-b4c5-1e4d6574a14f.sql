-- ============================================================
-- profiles table — extended user info (name, avatar)
-- Linked to auth.users by user_id (NOT a foreign key per project rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- admin_invites table — pending email invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read invites"
  ON public.admin_invites FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create invites"
  ON public.admin_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "Admins can revoke invites"
  ON public.admin_invites FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- on signup: create profile, auto-grant admin if invited
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row public.admin_invites%ROWTYPE;
BEGIN
  -- 1) Create a profile for every new user.
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2) If their email matches a pending invite, grant admin access.
  SELECT * INTO invite_row FROM public.admin_invites
   WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL
   LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.admin_users (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    UPDATE public.admin_invites SET accepted_at = now() WHERE id = invite_row.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();